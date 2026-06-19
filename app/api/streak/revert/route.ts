import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';
import { invalidateReportCache } from '../../report-cache';

type RevertStreakRewardBody = {
  childId: 'ali' | 'said';
  eventId: string;
  rewardId: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RevertStreakRewardBody;
    const { childId, eventId, rewardId } = body;

    if (!childId || !eventId || !rewardId) {
      return NextResponse.json({ error: 'childId, eventId, and rewardId are required' }, { status: 400 });
    }

    // 1. Mark the parent event as reverted
    const eventsKey = 'aq:events:parent';
    const parentEvents = await getJson(eventsKey) || [];
    const eventIndex = parentEvents.findIndex((ev: any) => ev.id === eventId);
    
    if (eventIndex < 0) {
      return NextResponse.json({ error: 'Parent event not found' }, { status: 404 });
    }

    const event = parentEvents[eventIndex];
    if (event.details?.reverted) {
      return NextResponse.json({ error: 'Event already reverted' }, { status: 400 });
    }

    // Update event state
    event.details = {
      ...(event.details || {}),
      reverted: true
    };
    event.reverted = true;
    parentEvents[eventIndex] = event;
    await setJson(eventsKey, parentEvents);

    // 2. Decrement the earned count for this reward
    const earnedKey = `aq:streak-rewards:earned:${childId}`;
    const earned = await getJson(earnedKey) || {};
    if (earned[rewardId] !== undefined) {
      earned[rewardId] = Math.max(0, (Number(earned[rewardId]) || 0) - 1);
      if (earned[rewardId] === 0) {
        delete earned[rewardId];
      }
      await setJson(earnedKey, earned);
    }

    // 3. Remove stars from ledger
    const ledgerKey = `aq:star-ledger:${childId}`;
    const ledger = await getJson(ledgerKey) || [];
    const removedEntries = ledger.filter(
      (item: any) => item?.source === 'streak-reward' && item?.sourceId === rewardId
    );
    const finalLedger = ledger.filter(
      (item: any) => !(item?.source === 'streak-reward' && item?.sourceId === rewardId)
    );
    await setJson(ledgerKey, finalLedger);

    await invalidateReportCache(childId);

    const removedStars = removedEntries.reduce((sum: number, item: any) => sum + (Number(item?.amount) || 0), 0);
    const balance = finalLedger.reduce((sum: number, item: any) => sum + (Number(item?.amount) || 0), 0);

    return NextResponse.json({
      success: true,
      removedStars,
      balance
    });
  } catch (error) {
    console.error('Error reverting streak reward:', error);
    return NextResponse.json({ error: 'Failed to revert streak reward' }, { status: 500 });
  }
}
