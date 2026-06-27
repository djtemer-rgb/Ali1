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
    const { childId, freezeHearts } = body;

    if (!childId || freezeHearts === undefined) {
      return NextResponse.json({ error: 'childId and freezeHearts are required' }, { status: 400 });
    }

    const val = Number(freezeHearts);
    if (val < 0 || val > 2) {
      return NextResponse.json({ error: 'freezeHearts must be between 0 and 2' }, { status: 400 });
    }

    const progressKey = `aq:streak-progress:${childId}`;
    const progress = await getJson(progressKey) || { currentStreak: 0, lastCompletedDate: '' };

    const oldHearts = progress.freezeHearts !== undefined ? Number(progress.freezeHearts) : 2;
    const date = new Date().toISOString().split('T')[0];

    // Update progress
    progress.freezeHearts = val;
    
    // If hearts are set to 2, reset lastHeartRestoreDate to today
    if (val >= 2) {
      progress.lastHeartRestoreDate = date;
    } else if (val > oldHearts) {
      // If we recovered a heart (e.g. 0 -> 1), reset the restore timer start to today
      progress.lastHeartRestoreDate = date;
    }

    await setJson(progressKey, progress);

    // Create system notification for manual heart adjustment
    try {
      const childName = childId === 'ali' ? 'Али' : 'Саид';
      const eventsKey = 'aq:events:parent';
      const events = await getJson(eventsKey) || [];
      const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newEvent = {
        id: eventId,
        childId,
        type: 'system',
        title: 'Изменение сердечек вручную',
        body: `Родитель вручную изменил количество сердечек для ${childName}: ${val} из 2. ❤️`,
        read: false,
        createdAt: new Date().toISOString()
      };
      events.push(newEvent);
      await setJson(eventsKey, events);
    } catch (err) {
      console.error('Failed to create parent event for manual hearts update:', err);
    }

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error('Error updating streak hearts:', error);
    return NextResponse.json({ error: 'Failed to update streak hearts' }, { status: 500 });
  }
}
