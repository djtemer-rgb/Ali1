import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';

export const dynamic = 'force-dynamic';

const DEFAULT_STREAK_REWARDS = [
  {
    id: 'streak-reward-1',
    title: 'Пандочка — Бамбу',
    description: 'Выполняй все задачи 3 дня подряд!\nСерия: Базовые',
    emoji: '🐼',
    daysStreak: 3,
    bonusStars: 10,
    active: true,
    color: 'blue',
    image: '/images/rewards/1.png',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-2',
    title: 'Капибара — Капи',
    description: 'Выполняй все задачи 6 дней подряд!\nСерия: Базовые',
    emoji: '🦫',
    daysStreak: 6,
    bonusStars: 15,
    active: true,
    color: 'blue',
    image: '/images/rewards/2.png',
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-3',
    title: 'Енотик — Плюш',
    description: 'Выполняй все задачи 9 дней подряд!\nСерия: Базовые',
    emoji: '🦝',
    daysStreak: 9,
    bonusStars: 20,
    active: true,
    color: 'blue',
    image: '/images/rewards/3.png',
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-4',
    title: 'Пингвинёнок — Пикс',
    description: 'Выполняй все задачи 12 дней подряд!\nСерия: Базовые',
    emoji: '🐧',
    daysStreak: 12,
    bonusStars: 25,
    active: true,
    color: 'blue',
    image: '/images/rewards/4.png',
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-5',
    title: 'Хаски — Фрост',
    description: 'Выполняй все задачи 15 дней подряд!\nСерия: Базовые',
    emoji: '🐶',
    daysStreak: 15,
    bonusStars: 30,
    active: true,
    color: 'blue',
    image: '/images/rewards/5.png',
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-6',
    title: 'Ледяной дракончик — Кристалл',
    description: 'Выполняй все задачи 19 дней подряд!\nСерия: Редкие',
    emoji: '❄️',
    daysStreak: 19,
    bonusStars: 40,
    active: true,
    color: 'orange',
    image: '/images/rewards/6.png',
    sortOrder: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-7',
    title: 'Лисёнок — Фокси',
    description: 'Выполняй все задачи 23 дня подряд!\nСерия: Редкие',
    emoji: '🦊',
    daysStreak: 23,
    bonusStars: 50,
    active: true,
    color: 'orange',
    image: '/images/rewards/7.png',
    sortOrder: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-8',
    title: 'Крокодильчик — Крокси',
    description: 'Выполняй все задачи 27 дней подряд!\nСерия: Редкие',
    emoji: '🐊',
    daysStreak: 27,
    bonusStars: 60,
    active: true,
    color: 'orange',
    image: '/images/rewards/8.png',
    sortOrder: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-9',
    title: 'Волчонок — Норд',
    description: 'Выполняй все задачи 31 день подряд!\nСерия: Редкие',
    emoji: '🐺',
    daysStreak: 31,
    bonusStars: 70,
    active: true,
    color: 'orange',
    image: '/images/rewards/9.png',
    sortOrder: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-10',
    title: 'Коала — Эвка',
    description: 'Выполняй все задачи 35 дней подряд!\nСерия: Редкие',
    emoji: '🐨',
    daysStreak: 35,
    bonusStars: 80,
    active: true,
    color: 'orange',
    image: '/images/rewards/10.png',
    sortOrder: 9,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-11',
    title: 'Огненный дракончик — Искрик',
    description: 'Выполняй все задачи 40 дней подряд!\nСерия: Эпические',
    emoji: '🔥',
    daysStreak: 40,
    bonusStars: 100,
    active: true,
    color: 'red',
    image: '/images/rewards/11.png',
    sortOrder: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-12',
    title: 'Тигрёнок — Рыкс',
    description: 'Выполняй все задачи 45 дней подряд!\nСерия: Эпические',
    emoji: '🐯',
    daysStreak: 45,
    bonusStars: 120,
    active: true,
    color: 'red',
    image: '/images/rewards/12.png',
    sortOrder: 11,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-13',
    title: 'Орлёнок — Скай',
    description: 'Выполняй все задачи 50 дней подряд!\nСерия: Эпические',
    emoji: '🦅',
    daysStreak: 50,
    bonusStars: 140,
    active: true,
    color: 'red',
    image: '/images/rewards/13.png',
    sortOrder: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-14',
    title: 'Буйволёнок — Гром',
    description: 'Выполняй все задачи 55 дней подряд!\nСерия: Эпические',
    emoji: '🐂',
    daysStreak: 55,
    bonusStars: 160,
    active: true,
    color: 'red',
    image: '/images/rewards/14.png',
    sortOrder: 13,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-15',
    title: 'Хамелеончик — Спектр',
    description: 'Выполняй все задачи 60 дней подряд!\nСерия: Эпические',
    emoji: '🦎',
    daysStreak: 60,
    bonusStars: 180,
    active: true,
    color: 'red',
    image: '/images/rewards/15.png',
    sortOrder: 14,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-16',
    title: 'Лесной дракончик — Вердан',
    description: 'Выполняй все задачи 66 дней подряд!\nСерия: Легендарные',
    emoji: '🐉',
    daysStreak: 66,
    bonusStars: 220,
    active: true,
    color: 'purple',
    image: '/images/rewards/16.png',
    sortOrder: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-17',
    title: 'Носорог — Титан',
    description: 'Выполняй все задачи 72 дня подряд!\nСерия: Легендарные',
    emoji: '🦏',
    daysStreak: 72,
    bonusStars: 250,
    active: true,
    color: 'purple',
    image: '/images/rewards/17.png',
    sortOrder: 16,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-18',
    title: 'Леопардик — Блиц',
    description: 'Выполняй все задачи 78 дней подряд!\nСерия: Легендарные',
    emoji: '🐆',
    daysStreak: 78,
    bonusStars: 300,
    active: true,
    color: 'purple',
    image: '/images/rewards/18.png',
    sortOrder: 17,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-19',
    title: 'Акулёнок — Риф',
    description: 'Выполняй все задачи 84 дня подряд!\nСерия: Легендарные',
    emoji: '🦈',
    daysStreak: 84,
    bonusStars: 350,
    active: true,
    color: 'purple',
    image: '/images/rewards/19.png',
    sortOrder: 18,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'streak-reward-20',
    title: 'Звёздный дракончик — Астра',
    description: 'Выполняй все задачи 90 дней подряд!\nСерия: Легендарные',
    emoji: '✨',
    daysStreak: 90,
    bonusStars: 500,
    active: true,
    color: 'purple',
    image: '/images/rewards/20.png',
    sortOrder: 19,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceSeed = url.searchParams.get('seed') === '1';

    let rewards = await getJson('aq:streak-rewards');
    if (!rewards || !Array.isArray(rewards) || forceSeed) {
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
