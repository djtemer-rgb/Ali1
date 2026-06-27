import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';
import { invalidateReportCache } from '../../report-cache';
import { getChildSettings } from '@/app/lib/settings-shared';
import { sendTelegramIfEnabled, sendWebPushToChild } from '@/app/lib/notifications';
import { processStreakAndHearts } from '@/app/lib/streak-utils';

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

    // Use shared pure logic to first calculate/apply missed days (if any)
    const { nextProgress: midProgress, heartConsumed } = processStreakAndHearts(
      progress,
      date,
      freezeRestoreDays
    );

    // Apply today's completion on top of the midProgress
    let newStreak = 1;
    if (midProgress.lastCompletedDate) {
      // Since processStreakAndHearts filled/protected all missed days up to yesterday,
      // the lastCompletedDate is now guaranteed to be yesterday, so we just increment by 1.
      newStreak = midProgress.currentStreak + 1;
    } else {
      // First completion starting streak (or after streak reset)
      newStreak = 1;
    }

    // Save final progress
    const nextProgress = {
      currentStreak: newStreak,
      lastCompletedDate: date,
      freezeHearts: midProgress.freezeHearts,
      lastHeartRestoreDate: midProgress.lastHeartRestoreDate
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
          body: `${childName} пропустил дней: ${heartConsumed}, но его серия сохранена! Осталось сердечек: ${nextProgress.freezeHearts} из 2. ❤️`,
          read: false,
          createdAt: new Date().toISOString()
        };
        events.push(newEvent);
        await setJson(eventsKey, events);

        // Telegram alert
        const tgMessage = `❤️ <b>Использована заморозка серии!</b>\n\n${childName} пропустил дней: ${heartConsumed}, но его серия сохранена! Осталось сердечек: ${nextProgress.freezeHearts} из 2.`;
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
