import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';

const DEFAULT_REWARDS = [
  {
    id: 'reward-1',
    childId: 'both',
    title: '1 час видеоигр',
    description: 'Можно играть 1 час в любимые игры',
    costStars: 10,
    icon: '🎮',
    iconStyle: 'color',
    active: true,
    sortOrderByChild: { ali: 0, said: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'reward-2',
    childId: 'both',
    title: 'Поход в кино',
    description: 'Поход в кинотеатр на любой фильм',
    costStars: 50,
    icon: '🎬',
    iconStyle: 'color',
    active: true,
    sortOrderByChild: { ali: 1, said: 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'reward-3',
    childId: 'both',
    title: 'Новое Лего',
    description: 'Покупка нового набора Лего',
    costStars: 200,
    icon: '🧱',
    iconStyle: 'color',
    active: true,
    sortOrderByChild: { ali: 2, said: 2 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId') || 'ali';
    
    let rewards = await getJson('aq:rewards');
    if (!rewards || !Array.isArray(rewards)) {
      rewards = DEFAULT_REWARDS;
      await setJson('aq:rewards', rewards);
    }
    
    // Filter rewards for this child (include 'both' rewards)
    const filtered = rewards
      .filter((r: any) => r.active && (r.childId === childId || r.childId === 'both'))
      .sort((a: any, b: any) => getRewardOrder(a, childId) - getRewardOrder(b, childId) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error getting rewards:', error);
    return NextResponse.json(DEFAULT_REWARDS);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rewards = await getJson('aq:rewards') || [];

    if (Array.isArray(body.rewards)) {
      const normalized = body.rewards.map((reward: any, index: number) => ({
        ...reward,
        sortOrderByChild: reward.sortOrderByChild || {},
        updatedAt: new Date().toISOString()
      }));
      await setJson('aq:rewards', normalized);
      return NextResponse.json(normalized);
    }
    
    const childId = body.childId || 'ali';
    const nextOrder = rewards
      .filter((r: any) => r.active && (r.childId === childId || r.childId === 'both'))
      .reduce((max: number, reward: any) => Math.max(max, getRewardOrder(reward, childId)), -1) + 1;

    const newReward = {
      id: `reward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      sortOrderByChild: {
        ...(body.sortOrderByChild || {}),
        [childId]: Number.isFinite(Number(body.sortOrderByChild?.[childId])) ? Number(body.sortOrderByChild[childId]) : nextOrder
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    rewards.push(newReward);
    await setJson('aq:rewards', rewards);
    
    return NextResponse.json(newReward);
  } catch (error) {
    console.error('Error saving reward:', error);
    return NextResponse.json({ error: 'Failed to save reward' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updatesList = Array.isArray(body.updates) ? body.updates : null;
    if (updatesList) {
      let rewards = await getJson('aq:rewards') || [];
      rewards = rewards.map((r: any) => {
        const update = updatesList.find((item: any) => item.id === r.id);
        return update ? { ...r, ...update, updatedAt: new Date().toISOString() } : r;
      });
      await setJson('aq:rewards', rewards);
      return NextResponse.json(rewards);
    }

    const { id, ...updates } = body;
    
    let rewards = await getJson('aq:rewards') || [];
    rewards = rewards.map((r: any) => 
      r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
    );
    
    await setJson('aq:rewards', rewards);
    return NextResponse.json(rewards);
  } catch (error) {
    console.error('Error updating reward:', error);
    return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 });
  }
}

function getRewardOrder(reward: any, childId: string) {
  return Number.isFinite(Number(reward?.sortOrderByChild?.[childId]))
    ? Number(reward.sortOrderByChild[childId])
    : Number.isFinite(Number(reward?.sortOrderByChild?.both))
      ? Number(reward.sortOrderByChild.both)
      : 9999;
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    let rewards = await getJson('aq:rewards') || [];
    rewards = rewards.filter((r: any) => r.id !== id);
    await setJson('aq:rewards', rewards);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reward:', error);
    return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 });
  }
}
