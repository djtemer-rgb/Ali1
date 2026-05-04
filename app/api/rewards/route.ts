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
    const filtered = rewards.filter((r: any) => r.active && (r.childId === childId || r.childId === 'both'));
    
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
    
    const newReward = {
      id: `reward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
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
