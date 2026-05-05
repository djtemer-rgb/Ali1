import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId') || 'ali';
    const rewardId = url.searchParams.get('rewardId');

    const statuses = await getJson(`aq:reward-status:${childId}`) || [];

    if (rewardId) {
      const status = statuses.find((s: any) => s.rewardId === rewardId);
      return NextResponse.json(status || { status: 'available' });
    }

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error getting reward status:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, rewardId, status } = body;

    const statuses = await getJson(`aq:reward-status:${childId}`) || [];
    const existing = statuses.findIndex((s: any) => s.rewardId === rewardId);

    const newStatus = {
      rewardId,
      childId,
      status,
      selectedAt: status === 'selected' ? new Date().toISOString() : undefined,
      fulfilledAt: status === 'fulfilled' ? new Date().toISOString() : undefined,
    };

    if (status === 'available') {
      newStatus.selectedAt = undefined;
      newStatus.fulfilledAt = undefined;
    }

    if (existing >= 0) {
      statuses[existing] = { ...statuses[existing], ...newStatus };
    } else {
      statuses.push(newStatus);
    }

    await setJson(`aq:reward-status:${childId}`, statuses);
    return NextResponse.json(newStatus);
  } catch (error) {
    console.error('Error saving reward status:', error);
    return NextResponse.json({ error: 'Failed to save reward status' }, { status: 500 });
  }
}
