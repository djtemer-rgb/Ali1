import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';

export const dynamic = 'force-dynamic';

const DEFAULT_STREAK_REWARDS = [
  {
    id: 'streak-reward-1',
    title: 'Бронзовый кубок',
    description: 'Выполняй все задачи 3 дня подряд!',
    emoji: '🥈',
    daysStreak: 3,
    bonusStars: 5,
    active: true,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-2',
    title: 'Серебряный кубок',
    description: 'Выполняй все задачи 7 дней подряд!',
    emoji: '🥇',
    daysStreak: 7,
    bonusStars: 15,
    active: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-3',
    title: 'Золотой кубок',
    description: 'Выполняй все задачи 14 дней подряд!',
    emoji: '🏆',
    daysStreak: 14,
    bonusStars: 30,
    active: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(request: Request) {
  try {
    let rewards = await getJson('aq:streak-rewards');
    if (!rewards || !Array.isArray(rewards)) {
      rewards = DEFAULT_STREAK_REWARDS;
      await setJson('aq:streak-rewards', rewards);
    }
    
    // Sort rewards by sortOrder or daysStreak
    const sorted = [...rewards].sort((a: any, b: any) => {
      const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : 9999;
      const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : 9999;
      return orderA - orderB || a.daysStreak - b.daysStreak;
    });
    
    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Error getting streak rewards:', error);
    return NextResponse.json(DEFAULT_STREAK_REWARDS);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rewards = await getJson('aq:streak-rewards') || [];

    if (Array.isArray(body.rewards)) {
      const normalized = body.rewards.map((reward: any, index: number) => ({
        ...reward,
        active: reward.active !== false,
        sortOrder: typeof reward.sortOrder === 'number' ? reward.sortOrder : index,
        updatedAt: new Date().toISOString()
      }));
      await setJson('aq:streak-rewards', normalized);
      return NextResponse.json(normalized);
    }
    
    const newReward = {
      id: `streak-reward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      active: body.active !== false,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : rewards.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    rewards.push(newReward);
    await setJson('aq:streak-rewards', rewards);
    
    return NextResponse.json(newReward);
  } catch (error) {
    console.error('Error saving streak reward:', error);
    return NextResponse.json({ error: 'Failed to save streak reward' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updatesList = Array.isArray(body.updates) ? body.updates : null;
    if (updatesList) {
      let rewards = await getJson('aq:streak-rewards') || [];
      rewards = rewards.map((r: any) => {
        const update = updatesList.find((item: any) => item.id === r.id);
        if (!update) return r;
        return { ...r, ...update, active: update.active !== undefined ? !!update.active : r.active, updatedAt: new Date().toISOString() };
      });
      await setJson('aq:streak-rewards', rewards);
      return NextResponse.json(rewards);
    }

    const { id, ...updates } = body;
    let rewards = await getJson('aq:streak-rewards') || [];
    rewards = rewards.map((r: any) => 
      r.id === id ? { ...r, ...updates, active: updates.active !== undefined ? !!updates.active : r.active, updatedAt: new Date().toISOString() } : r
    );
    await setJson('aq:streak-rewards', rewards);
    return NextResponse.json(rewards);
  } catch (error) {
    console.error('Error updating streak reward:', error);
    return NextResponse.json({ error: 'Failed to update streak reward' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    let rewards = await getJson('aq:streak-rewards') || [];
    rewards = rewards.filter((r: any) => r.id !== id);
    await setJson('aq:streak-rewards', rewards);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting streak reward:', error);
    return NextResponse.json({ error: 'Failed to delete streak reward' }, { status: 500 });
  }
}
