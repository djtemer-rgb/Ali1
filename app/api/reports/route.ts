import { NextResponse } from 'next/server';
import { redis, getJson, setJson } from '../upstash';
import {
  buildReportTaskEntry,
  buildSubtaskSummary,
  formatDifficultyLabel,
  formatStarSourceLabel,
  getCategoryLabel,
  type ReportInsightSource,
} from '@/app/lib/reporting';
import { getChildSettings } from '@/app/lib/settings-shared';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId') || 'ali';
    const days = Number.parseInt(url.searchParams.get('days') || '7', 10);

    const settings = await getJson('aq:settings') as any || {};
    const childSettings = getChildSettings(settings, childId as 'ali' | 'said');
    const gradeHistoryLimit = clamp(
      Number.isFinite(Number(settings?.gradeHistoryLimit))
        ? Number(settings.gradeHistoryLimit)
        : 20,
      20,
      50,
    );

    // Check cache
    const cacheKey = `aq:report:cache:${childId}:${days}:grades-${gradeHistoryLimit}`;
    const cached = await getJson(cacheKey);
    if (cached) return NextResponse.json(cached);

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    const periodStartMs = startDate.getTime();
    const periodEndMs = today.getTime();

    // Generate all day keys
    const dayKeys: string[] = [];
    const dateLabels: string[] = [];
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      dayKeys.push(`aq:day:${childId}:${d.toISOString().split('T')[0]}`);
      dateLabels.push(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
    }

    // Batch read days so large ranges stay stable on Redis
    const rawDays = await readDaysInBatches(dayKeys, 30);

    let totalTasksCompleted = 0;
    let totalStarsEarned = 0;
    let streakDays = 0;
    let currentStreak = 0;
    const categoryCounts: Record<string, number> = {};
    const chartTasks: number[] = [];
    const chartStars: number[] = [];
    const recentTasks: any[] = [];
    const completedDayItems: Array<{
      label: string;
      date: string;
      tasksCompleted: number;
      starsEarned: number;
    }> = [];

    const ledger = await getJson(`aq:star-ledger:${childId}`) || [];
    const ledgerEntries = Array.isArray(ledger)
      ? ledger
          .filter((item: any) => isInRange(item.createdAt || item.date, periodStartMs, periodEndMs))
          .map((item: any) => ({
            ...item,
            amount: Number(item?.amount) || 0,
            createdAt: item.createdAt || item.date || new Date().toISOString(),
          }))
      : [];

    const ledgerByDate = new Map<string, { net: number; positive: number; negative: number }>();
    for (const item of ledgerEntries) {
      const dateKey = (item.createdAt || item.date || '').split('T')[0];
      if (!dateKey) continue;
      const current = ledgerByDate.get(dateKey) || { net: 0, positive: 0, negative: 0 };
      current.net += item.amount;
      if (item.amount > 0) current.positive += item.amount;
      if (item.amount < 0) current.negative += Math.abs(item.amount);
      ledgerByDate.set(dateKey, current);
      if (item.amount > 0) totalStarsEarned += item.amount;
    }

    for (let i = 0; i < dayKeys.length; i++) {
      const raw = rawDays[i];
      const dayTasks = parseRedisList(raw);

      let dayCompleted = 0;
      const dayLedger = ledgerByDate.get(dayKeys[i].split(':').pop() || '') || { net: 0, positive: 0, negative: 0 };

      if (Array.isArray(dayTasks)) {
        for (const task of dayTasks) {
          if (task.completed) {
            dayCompleted++;
            const cat = getCategoryLabel(task.category || 'other', task.customCategory || '');
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            recentTasks.push(
              buildReportTaskEntry({
                ...task,
                completedAt: task.completedAt || `${dayKeys[i].split(':').pop()}T23:59:59.999Z`,
              })
            );
          }
        }
      }

      chartTasks.push(dayCompleted);
      chartStars.push(dayLedger.net);
      completedDayItems.push({
        label: dateLabels[i],
        date: dayKeys[i].split(':').pop() || '',
        tasksCompleted: dayCompleted,
        starsEarned: dayLedger.positive,
      });
      totalTasksCompleted += dayCompleted;

      if (dayCompleted > 0) { currentStreak++; streakDays = Math.max(streakDays, currentStreak); }
      else { currentStreak = 0; }
    }

    const bestDay = completedDayItems.reduce((best, item) => {
      if (!best) return item;
      if (item.starsEarned > best.starsEarned) return item;
      if (item.starsEarned === best.starsEarned && item.tasksCompleted > best.tasksCompleted) return item;
      return best;
    }, null as null | (typeof completedDayItems)[number]);

    let topCategoryEntry = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0] || null;
    let topCategorySource: ReportInsightSource = 'period';

    let topTask = [...recentTasks]
      .sort((a, b) => (b.stars || 0) - (a.stars || 0) || new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0] || null;
    let topTaskSource: ReportInsightSource = 'period';

    if (!topCategoryEntry || !topTask) {
      const allTimeTasks = await readAllCompletedTasks(childId);
      if (!topCategoryEntry && allTimeTasks.length > 0) {
        const allTimeCategoryCounts: Record<string, number> = {};
        for (const task of allTimeTasks) {
          const cat = getCategoryLabel(task.category || 'other', task.customCategory || '');
          allTimeCategoryCounts[cat] = (allTimeCategoryCounts[cat] || 0) + 1;
        }
        const fallbackCategory = Object.entries(allTimeCategoryCounts).sort((a, b) => b[1] - a[1])[0] || null;
        if (fallbackCategory) {
          topCategoryEntry = fallbackCategory;
          topCategorySource = 'all-time';
        }
      }
      if (!topTask && allTimeTasks.length > 0) {
        topTask = [...allTimeTasks]
          .sort((a, b) => (b.stars || 0) - (a.stars || 0) || new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0] || null;
        if (topTask) {
          topTaskSource = 'all-time';
        }
      }
    }

    // Get grades — batch read all grades and filter locally
    const allGrades = await getJson('aq:grades');
    const periodGradesAll = Array.isArray(allGrades)
      ? allGrades.filter((g: any) =>
          g.childId === childId &&
          isInRange(g.createdAt, periodStartMs, periodEndMs)
        ).map((grade: any) => ({
          ...grade,
          starsAwarded: (() => {
            const mapped = childSettings.gradeToStars?.[String(grade.grade)] ?? (
              grade.grade === 5 ? 5 : grade.grade === 4 ? 2 : 0
            );
            if (typeof grade.starsAwarded === 'number') {
              if (grade.starsAwarded !== 0) return grade.starsAwarded;
              if (grade.grade === 3) return 0;
            }
            return mapped;
          })()
        })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : [];
    const totalGradesCount = periodGradesAll.length;
    const periodGrades = periodGradesAll.slice(0, gradeHistoryLimit);

    // Get reward statuses
    const rewardStatuses = await getJson(`aq:reward-status:${childId}`) || [];
    const selected = Array.isArray(rewardStatuses)
      ? rewardStatuses.filter((s: any) => s.status === 'selected').length : 0;
    const fulfilled = Array.isArray(rewardStatuses)
      ? rewardStatuses.filter((s: any) => s.status === 'fulfilled').length : 0;

    // Get current balance
    const currentBalance = Array.isArray(ledger)
      ? ledger.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) : 0;
    const recentStarEntries = Array.isArray(ledger)
      ? ledger
          .filter((item: any) => isInRange(item.createdAt || item.date, periodStartMs, periodEndMs))
          .map((item: any) => {
            const details = item.details || {};
            const taskTitle = details.taskTitle || extractTaskTitleFromReason(item.reason);
            const subtaskBundle = buildSubtaskSummary(details.subtasks, 4);
            return {
              id: item.id,
              amount: item.amount || 0,
              source: item.source || 'manual',
              sourceLabel: formatStarSourceLabel(item.source || 'manual'),
              reason: item.reason || '',
              createdAt: item.createdAt || item.date || new Date().toISOString(),
              taskTitle,
              difficultyLabel: details.difficultyLabel || formatDifficultyLabel(details.difficulty) || null,
              subtaskSummary: details.subtaskSummary || subtaskBundle.summary,
            };
          })
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 12)
      : [];

    const recentTaskEntries = [...recentTasks]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 12);

    const report = {
      period: { days, startDate: startDate.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] },
      summary: { totalTasksCompleted, totalStarsEarned, totalGradesCount, streakDays, currentBalance },
      insights: {
        bestDay: bestDay
          ? {
              label: bestDay.label,
              date: bestDay.date,
              tasksCompleted: bestDay.tasksCompleted,
              starsEarned: bestDay.starsEarned,
            }
          : null,
        topCategory: topCategoryEntry
          ? { name: topCategoryEntry[0], count: topCategoryEntry[1], sourceLabel: topCategorySource === 'all-time' ? 'за всё время' : undefined }
          : null,
        topTask: topTask
          ? {
              title: topTask.title,
              stars: topTask.stars,
              completedAt: topTask.completedAt,
              difficultyLabel: topTask.difficultyLabel || null,
              sourceLabel: topTaskSource === 'all-time' ? 'за всё время' : undefined,
            }
          : null,
      },
      chart: { labels: dateLabels, tasksCompleted: chartTasks, starsEarned: chartStars },
      categories: categoryCounts,
      rewards: { selected, fulfilled },
      grades: periodGrades,
      recentTasks: recentTaskEntries,
      recentStarEntries,
      settings: { gradeHistoryLimit, gradeToStars: childSettings.gradeToStars || { '5': 5, '4': 2, '3': 0, '2': 0 } },
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

function extractTaskTitleFromReason(reason?: string) {
  if (!reason) return undefined;
  const match = reason.match(/Выполнена задача:\s*(.+?)(?:\s*—|\s*\(|$)/i);
  return match?.[1]?.trim();
}

async function readDaysInBatches(keys: string[], batchSize: number) {
  const results: (string | null)[] = [];
  for (let index = 0; index < keys.length; index += batchSize) {
    const slice = keys.slice(index, index + batchSize);
    if (slice.length === 0) continue;
    const batch = await redis.mget(...slice) as (string | null)[];
    results.push(...batch);
  }
  return results;
}

async function readAllCompletedTasks(childId: string) {
  const keys = await scanAllKeys(`aq:day:${childId}:*`);
  if (keys.length === 0) return [];

  const sortedKeys = [...keys].sort((a, b) => a.localeCompare(b));
  const rawDays = await readDaysInBatches(sortedKeys, 30);
  const tasks: any[] = [];

  for (let i = 0; i < sortedKeys.length; i++) {
    const raw = rawDays[i];
    if (!raw) continue;
    const dayTasks = parseRedisList(raw);
    const dateKey = sortedKeys[i].split(':').pop() || new Date().toISOString().split('T')[0];

    if (Array.isArray(dayTasks)) {
      for (const task of dayTasks) {
        if (!task?.completed) continue;
        tasks.push(
          buildReportTaskEntry({
            ...task,
            completedAt: task.completedAt || `${dateKey}T23:59:59.999Z`,
          })
        );
      }
    }
  }

  return tasks;
}

async function scanAllKeys(match: string) {
  const found = new Set<string>();
  let cursor: string | number = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match, count: 200 });
    cursor = nextCursor;
    keys.forEach((key) => found.add(key));
  } while (`${cursor}` !== '0');

  return Array.from(found);
}

function isInRange(value: string | undefined, startMs: number, endMs: number) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= startMs && time <= endMs;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseRedisList(raw: any) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    if (Array.isArray((raw as any).result)) return (raw as any).result;
    if (Array.isArray((raw as any).value)) return (raw as any).value;
  }
  return [];
}
