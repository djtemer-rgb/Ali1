import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';
import { processStreakAndHearts } from '@/app/lib/streak-utils';
import { sendTelegramIfEnabled } from '@/app/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId') === 'said' ? 'said' : 'ali';
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const progressKey = `aq:streak-progress:${childId}`;
    const progress = await getJson(progressKey) || { currentStreak: 0, lastCompletedDate: '' };
    
    // Load settings for restore interval
    const settings = await getJson('aq:settings') || {};
    const freezeRestoreDays = Number(settings.freezeRestoreDays) || 5;

    // Use shared pure logic
    const { nextProgress, progressChanged, heartConsumed } = processStreakAndHearts(
      progress,
      date,
      freezeRestoreDays
    );

    if (progressChanged) {
      await setJson(progressKey, nextProgress);

      // If hearts were consumed, log event and notify
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
    }

    const earned = await getJson(`aq:streak-rewards:earned:${childId}`) || {};

    return NextResponse.json({
      currentStreak: nextProgress.currentStreak,
      lastCompletedDate: nextProgress.lastCompletedDate,
      freezeHearts: nextProgress.freezeHearts,
      lastHeartRestoreDate: nextProgress.lastHeartRestoreDate,
      earned: earned || {}
    });
  } catch (error) {
    console.error('Error getting streak progress:', error);
    return NextResponse.json({
      currentStreak: 0,
      lastCompletedDate: '',
      freezeHearts: 2,
      lastHeartRestoreDate: '',
      earned: {}
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, freezeHearts, mode } = body;

    if (!childId || freezeHearts === undefined) {
      return NextResponse.json({ error: 'childId and freezeHearts are required' }, { status: 400 });
    }

    const val = Number(freezeHearts);
    if (val < 1 || val > 2) {
      if (mode === 'add') {
        return NextResponse.json({ error: 'freezeHearts to add must be 1 or 2' }, { status: 400 });
      }
      if (val < 0 || val > 2) {
        return NextResponse.json({ error: 'freezeHearts must be between 0 and 2' }, { status: 400 });
      }
    }

    const targets: ('ali' | 'said')[] = (childId === 'both' || childId === 'common') ? ['ali', 'said'] : [childId as 'ali' | 'said'];
    const results: Record<string, any> = {};

    for (const cid of targets) {
      const progressKey = `aq:streak-progress:${cid}`;
      const progress = await getJson(progressKey) || { currentStreak: 0, lastCompletedDate: '' };
      const oldHearts = progress.freezeHearts !== undefined ? Number(progress.freezeHearts) : 2;
      const date = new Date().toISOString().split('T')[0];

      let nextHearts = oldHearts;
      if (mode === 'add') {
        nextHearts = Math.min(2, oldHearts + val);
      } else {
        nextHearts = Math.min(2, Math.max(0, val));
      }

      progress.freezeHearts = nextHearts;

      if (nextHearts >= 2) {
        progress.lastHeartRestoreDate = date;
      } else if (nextHearts > oldHearts) {
        progress.lastHeartRestoreDate = date;
      }

      await setJson(progressKey, progress);

      try {
        const childName = cid === 'ali' ? 'Али' : 'Саид';
        const eventsKey = 'aq:events:parent';
        const events = await getJson(eventsKey) || [];
        const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const actionTitle = mode === 'add' ? 'Пополнение сердечек' : 'Изменение сердечек вручную';
        const actionBody = mode === 'add'
          ? `Родитель пополнил сердечки (+${val}) для ${childName}. Стало: ${nextHearts} из 2. ❤️`
          : `Родитель вручную установил количество сердечек для ${childName}: ${nextHearts} из 2. ❤️`;

        const newEvent = {
          id: eventId,
          childId: cid,
          type: 'system',
          title: actionTitle,
          body: actionBody,
          read: false,
          createdAt: new Date().toISOString()
        };
        events.push(newEvent);
        await setJson(eventsKey, events);
      } catch (err) {
        console.error('Failed to create parent event for hearts update:', err);
      }

      results[cid] = progress;
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error updating streak hearts:', error);
    return NextResponse.json({ error: 'Failed to update streak hearts' }, { status: 500 });
  }
}
