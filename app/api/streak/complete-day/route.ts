import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';
import { invalidateReportCache } from '../../report-cache';
import { getChildSettings } from '@/app/lib/settings-shared';
import { sendTelegramIfEnabled, sendWebPushToChild } from '@/app/lib/notifications';

export const dynamic = 'force-dynamic';

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, date } = body;

    if (!childId || !date) {
      return NextResponse.json({ error: 'childId and date are required' }, { status: 400 });
    }

    const progressKey = `aq:streak-progress:${childId}`;
    const earnedKey = `aq:streak-rewards:earned:${childId}`;

    const progress = await getJson(progressKey) || { currentStreak: 0, lastCompletedDate: '' };
    const currentStreak = Number(progress.currentStreak) || 0;
    const lastCompletedDate = progress.lastCompletedDate || '';

    // If already completed today, do not increment streak again
    if (lastCompletedDate === date) {
      return NextResponse.json({ success: true, newStreak: currentStreak, earnedReward: null });
    }

    // Load settings for restore interval
    const settings = await getJson('aq:settings') || {};
    const freezeRestoreDays = Number(settings.freezeRestoreDays) || 5;

    let freezeHearts = progress.freezeHearts !== undefined ? Number(progress.freezeHearts) : 2;
    let lastHeartRestoreDate = progress.lastHeartRestoreDate || lastCompletedDate || date;

    // Run heart recovery up to current completion 'date'
    if (freezeHearts >= 2) {
      lastHeartRestoreDate = date;
    } else {
      const parseUTCDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d));
      };

      const tToday = parseUTCDate(date).getTime();
      const tLast = parseUTCDate(lastHeartRestoreDate).getTime();
      const diffMs = tToday - tLast;

      if (diffMs > 0) {
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= freezeRestoreDays) {
          const intervals = Math.floor(diffDays / freezeRestoreDays);
          freezeHearts = Math.min(2, freezeHearts + intervals);

          const lastRestoreDateObj = parseUTCDate(lastHeartRestoreDate);
          lastRestoreDateObj.setUTCDate(lastRestoreDateObj.getUTCDate() + (intervals * freezeRestoreDays));
          lastHeartRestoreDate = lastRestoreDateObj.toISOString().split('T')[0];
          
          if (freezeHearts >= 2) {
            lastHeartRestoreDate = date;
          }
        }
      }
    }

    let newStreak = 1;
    let heartConsumed = 0;

    if (lastCompletedDate) {
      const parseUTCDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d));
      };

      const tCurrent = parseUTCDate(date).getTime();
      const tLast = parseUTCDate(lastCompletedDate).getTime();
      const diffMs = tCurrent - tLast;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak = currentStreak + 1;
      } else if (diffDays > 1) {
        const missedDays = diffDays - 1;
        if (freezeHearts >= missedDays) {
          // Consume hearts to save streak
          freezeHearts -= missedDays;
          heartConsumed = missedDays;
          newStreak = currentStreak + 1;
          
          if (freezeHearts === 2 - missedDays) {
            lastHeartRestoreDate = date;
          }
        } else {
          // Insufficient hearts: streak resets, hearts are fully refilled
          newStreak = 1;
          freezeHearts = 2;
          lastHeartRestoreDate = date;
        }
      } else {
        // diffDays <= 0 means same day or past day completed out of order
        newStreak = currentStreak;
      }
    } else {
      // First completion starting streak
      newStreak = 1;
    }

    // Save progress
    const nextProgress = {
      currentStreak: newStreak,
      lastCompletedDate: date,
      freezeHearts,
      lastHeartRestoreDate
    };
    await setJson(progressKey, nextProgress);

    // Create system notification for heart consumption if occurred
    if (heartConsumed > 0) {
      try {
        const childName = childId === 'ali' ? 'Али' : 'Саид';
        const eventsKey = 'aq:events:parent';
        const events = await getJson(eventsKey) || [];
        const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newEvent = {
          id: eventId,
          childId,
          type: 'system',
          title: 'Использована заморозка серии',
          body: `${childName} пропустил дней: ${heartConsumed}, но его серия сохранена! Осталось сердечек: ${freezeHearts} из 2. ❤️`,
          read: false,
          createdAt: new Date().toISOString()
        };
        events.push(newEvent);
        await setJson(eventsKey, events);

        // Telegram alert
        const tgMessage = `❤️ <b>Использована заморозка серии!</b>\n\n${childName} пропустил дней: ${heartConsumed}, но его серия сохранена! Осталось сердечек: ${freezeHearts} из 2.`;
        await sendTelegramIfEnabled(settings, childId, 'system', tgMessage);
      } catch (err) {
        console.error('Failed to send freeze hearts notifications:', err);
      }
    }

    // Load configured streak rewards
    const streakRewards = await getJson('aq:streak-rewards') || [];
    const matchedReward = Array.isArray(streakRewards)
      ? streakRewards.find((r: any) => r.active && Number(r.daysStreak) === newStreak)
      : null;

    let earnedReward = null;

    if (matchedReward) {
      earnedReward = matchedReward;

      // Update earned count
      const earned = await getJson(earnedKey) || {};
      earned[matchedReward.id] = (Number(earned[matchedReward.id]) || 0) + 1;
      await setJson(earnedKey, earned);

      // Award bonus stars if any
      if (Number(matchedReward.bonusStars) > 0) {
        const ledgerKey = `aq:star-ledger:${childId}`;
        const ledger = await getJson(ledgerKey) || [];
        const ledgerItem = {
          id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          childId,
          date,
          amount: Number(matchedReward.bonusStars),
          source: 'streak-reward',
          sourceId: matchedReward.id,
          reason: `Награда за серию побед ${matchedReward.daysStreak} дней: ${matchedReward.title} (+${matchedReward.bonusStars} ⭐)`,
          createdAt: new Date().toISOString()
        };
        ledger.push(ledgerItem);
        await setJson(ledgerKey, ledger);
      }

      await invalidateReportCache(childId);

      // Create Parent Event
      const eventsKey = 'aq:events:parent';
      const events = await getJson(eventsKey) || [];
      const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const childName = childId === 'ali' ? 'Али' : 'Саид';
      const newEvent = {
        id: eventId,
        childId,
        type: 'day-completed',
        title: 'Получена награда за серию побед!',
        body: `${childName} получил награду "${matchedReward.title}" за серию из ${matchedReward.daysStreak} дней подряд! 🎉 (+${matchedReward.bonusStars} ⭐)`,
        rewardId: matchedReward.id,
        details: {
          rewardTitle: matchedReward.title,
          costStars: Number(matchedReward.bonusStars),
          daysStreak: Number(matchedReward.daysStreak),
          status: 'fulfilled'
        },
        read: false,
        createdAt: new Date().toISOString()
      };
      events.push(newEvent);
      await setJson(eventsKey, events);

      // Send Telegram / Web Push Notifications
      try {
        const settings = await getJson('aq:settings') || {};
        const childSettings = getChildSettings(settings, childId);
        const tgMessage = `🔔 <b>Получена награда за серию побед!</b>\n\n<b>${escapeHtml(newEvent.title)}</b>\n${escapeHtml(newEvent.body)}`;

        await sendTelegramIfEnabled(settings, childId, 'day-completed', tgMessage);
        
        if (childSettings.notifications.webPush.enabled && childSettings.notifications.webPush.events['day-completed']) {
          await sendWebPushToChild(childId, {
            title: newEvent.title,
            body: newEvent.body,
            tag: 'day-completed',
            url: '/parent/inbox',
            data: {
              childId,
              eventId: newEvent.id,
              type: 'day-completed'
            }
          });
        }
      } catch (err) {
        console.error('Failed to send streak reward notifications:', err);
      }
    }

    return NextResponse.json({
      success: true,
      newStreak,
      earnedReward
    });
  } catch (error) {
    console.error('Error completing day streak:', error);
    return NextResponse.json({ error: 'Failed to complete day streak' }, { status: 500 });
  }
}
