import { NextResponse } from 'next/server';
import { redis, getJson, setJson } from '../upstash';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId') || 'ali';
    const days = parseInt(url.searchParams.get('days') || '7');

    // Check cache
    const cacheKey = `aq:report:cache:${childId}:${days}`;
    const cached = await getJson(cacheKey);
    if (cached) return NextResponse.json(cached);

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    // Generate all day keys
    const dayKeys: string[] = [];
    const dateLabels: string[] = [];
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      dayKeys.push(`aq:day:${childId}:${d.toISOString().split('T')[0]}`);
      dateLabels.push(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
    }

    // Batch read all days in ONE mget call
    const rawDays = await redis.mget(...dayKeys) as (string | null)[];

    let totalTasksCompleted = 0;
    let totalStarsEarned = 0;
    let streakDays = 0;
    let currentStreak = 0;
    const categoryCounts: Record<string, number> = {};
    const chartTasks: number[] = [];
    const chartStars: number[] = [];

    for (let i = 0; i < dayKeys.length; i++) {
      const raw = rawDays[i];
      let dayTasks: any[] = [];
      if (raw) {
        try { dayTasks = JSON.parse(raw); } catch { dayTasks = []; }
      }

      let dayCompleted = 0;
      let dayStars = 0;

      if (Array.isArray(dayTasks)) {
        for (const task of dayTasks) {
          if (task.completed) {
            dayCompleted++;
            dayStars += task.stars || 0;
            const cat = getCategoryLabel(task.category || 'other');
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          }
        }
      }

      chartTasks.push(dayCompleted);
      chartStars.push(dayStars);
      totalTasksCompleted += dayCompleted;
      totalStarsEarned += dayStars;

      if (dayCompleted > 0) { currentStreak++; streakDays = Math.max(streakDays, currentStreak); }
      else { currentStreak = 0; }
    }

    // Get grades — batch read all grades and filter locally
    const allGradesRaw = await redis.get<string>('aq:grades');
    const allGrades: any[] = allGradesRaw ? JSON.parse(allGradesRaw) : [];
    const periodGrades = Array.isArray(allGrades)
      ? allGrades.filter((g: any) =>
          g.childId === childId &&
          new Date(g.createdAt) >= startDate &&
          new Date(g.createdAt) <= today
        ).slice(-10).reverse()
      : [];
    const totalGradesCount = periodGrades.length;

    // Get reward statuses
    const rewardStatuses = await getJson(`aq:reward-status:${childId}`) || [];
    const selected = Array.isArray(rewardStatuses)
      ? rewardStatuses.filter((s: any) => s.status === 'selected').length : 0;
    const fulfilled = Array.isArray(rewardStatuses)
      ? rewardStatuses.filter((s: any) => s.status === 'fulfilled').length : 0;

    // Get current balance
    const ledger = await getJson(`aq:star-ledger:${childId}`) || [];
    const currentBalance = Array.isArray(ledger)
      ? ledger.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) : 0;

    const report = {
      period: { days, startDate: startDate.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] },
      summary: { totalTasksCompleted, totalStarsEarned, totalGradesCount, streakDays, currentBalance },
      chart: { labels: dateLabels, tasksCompleted: chartTasks, starsEarned: chartStars },
      categories: categoryCounts,
      rewards: { selected, fulfilled },
      grades: periodGrades,
    };

    // Cache for 5 minutes
    await setJson(cacheKey, report);
    await redis.expire(cacheKey, 300);

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

function getCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    study: 'Учёба', sport: 'Спорт', boxing: 'Бокс', chess: 'Шахматы',
    reading: 'Чтение', order: 'Порядок', 'home-help': 'Помощь', rest: 'Отдых', other: 'Другое'
  };
  return labels[cat] || cat;
}
