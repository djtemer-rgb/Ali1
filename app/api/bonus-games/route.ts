import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';

export const dynamic = 'force-dynamic';

// Key structure: aq:bonus-games:${childId}
// Value shape: Record<string, { completed: boolean; completedAt: string }>

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId') || 'ali';
    const games = await getJson(`aq:bonus-games:${childId}`) || {};
    return NextResponse.json(games);
  } catch (error) {
    console.error('Error getting bonus games:', error);
    return NextResponse.json({});
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, rewardId, gameId, completed } = body;

    if (!childId || !rewardId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const key = `aq:bonus-games:${childId}`;
    const games = await getJson(key) || {};

    games[rewardId] = {
      completed: !!completed,
      completedAt: completed ? new Date().toISOString() : undefined,
      gameId
    };

    await setJson(key, games);
    return NextResponse.json({ success: true, state: games[rewardId] });
  } catch (error) {
    console.error('Error saving bonus game completion:', error);
    return NextResponse.json({ error: 'Failed to save completion' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId');
    if (!childId || childId === 'all') {
      await setJson('aq:bonus-games:ali', {});
      await setJson('aq:bonus-games:said', {});
      return NextResponse.json({ success: true, message: 'All children reset' });
    }

    await setJson(`aq:bonus-games:${childId}`, {});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting bonus games:', error);
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
  }
}
