import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';
import { invalidateReportCache } from '../report-cache';

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
    const includeInactive = url.searchParams.get('includeInactive') === '1' || url.searchParams.get('includeInactive') === 'true';
    
    let rewards = await getJson('aq:rewards');
    if (!rewards || !Array.isArray(rewards)) {
      rewards = DEFAULT_REWARDS;
      await setJson('aq:rewards', rewards);
    }
    
    // Filter rewards for this child (include 'both' rewards)
    const filtered = rewards
      .filter((r: any) => (includeInactive || r.active) && (r.childId === childId || r.childId === 'both'))
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
        active: reward.active !== false,
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
      active: body.active !== false,
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
      const reactivatedIds: string[] = [];
      rewards = rewards.map((r: any) => {
        const update = updatesList.find((item: any) => item.id === r.id);
        if (!update) return r;
        if (update.active === true && r.active === false) {
          reactivatedIds.push(r.id);
        }
        return { ...r, ...update, active: update.active !== undefined ? !!update.active : r.active, updatedAt: new Date().toISOString() };
      });
      await setJson('aq:rewards', rewards);
      if (reactivatedIds.length > 0) {
        await resetFulfilledRewardStatuses(reactivatedIds);
      }
      return NextResponse.json(rewards);
    }

    const { id, ...updates } = body;
    
    let rewards = await getJson('aq:rewards') || [];
    const previous = rewards.find((r: any) => r.id === id);
    const nextActive = updates.active !== undefined ? !!updates.active : previous?.active;
    rewards = rewards.map((r: any) => 
      r.id === id ? { ...r, ...updates, active: updates.active !== undefined ? !!updates.active : r.active, updatedAt: new Date().toISOString() } : r
    );
    
    await setJson('aq:rewards', rewards);
    if (previous && previous.active === false && nextActive === true) {
      await resetFulfilledRewardStatuses([id]);
    }
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

async function resetFulfilledRewardStatuses(rewardIds: string[]) {
  const rewardIdSet = new Set(rewardIds.filter(Boolean));
  if (rewardIdSet.size === 0) return;
  for (const childId of ['ali', 'said'] as const) {
    const statuses = await getJson(`aq:reward-status:${childId}`) || [];
    if (!Array.isArray(statuses) || statuses.length === 0) continue;
    let changed = false;
    const nextStatuses = statuses.map((status: any) => {
      if (!rewardIdSet.has(status?.rewardId) || status.status !== 'fulfilled') return status;
      changed = true;
      return {
        ...status,
        status: 'available',
        selectedAt: undefined,
        fulfilledAt: undefined,
      };
    });
    if (changed) {
      await setJson(`aq:reward-status:${childId}`, nextStatuses);
      await invalidateReportCache(childId);
    }
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
