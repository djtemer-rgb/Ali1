import { NextResponse } from 'next/server';
import { getJson } from '../../upstash';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId') || 'ali';

    const progress = await getJson(`aq:streak-progress:${childId}`) || { currentStreak: 0, lastCompletedDate: '' };
    const earned = await getJson(`aq:streak-rewards:earned:${childId}`) || {};

    return NextResponse.json({
      currentStreak: progress.currentStreak || 0,
      lastCompletedDate: progress.lastCompletedDate || '',
      earned: earned || {}
    });
  } catch (error) {
    console.error('Error getting streak progress:', error);
    return NextResponse.json({
      currentStreak: 0,
      lastCompletedDate: '',
      earned: {}
    });
  }
}
