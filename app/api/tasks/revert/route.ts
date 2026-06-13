import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';
import { invalidateReportCache } from '../../report-cache';

type RevertTaskBody = {
  childId?: 'ali' | 'said';
  date?: string;
  taskId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RevertTaskBody;
    const childId = body.childId || 'ali';
    const date = body.date || new Date().toISOString().split('T')[0];
    const taskId = body.taskId;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const dayKey = `aq:day:${childId}:${date}`;
    const rawTasks = await getJson(dayKey);
    const tasks = Array.isArray(rawTasks) ? rawTasks : [];
    const taskIndex = tasks.findIndex((task: any) => task?.id === taskId);

    if (taskIndex < 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const currentTask = tasks[taskIndex];
    const revertedTask = normalizeRevertedTask(currentTask);
    if (!currentTask?.completed) {
      return NextResponse.json({ task: revertedTask, removedStars: 0, balance: await getCurrentBalance(childId) });
    }

    tasks[taskIndex] = revertedTask;
    await setJson(dayKey, tasks);

    await maybeReactivateOneTimeTemplate(currentTask);

    const ledgerKey = `aq:star-ledger:${childId}`;
    const rawLedger = await getJson(ledgerKey);
    const ledger = Array.isArray(rawLedger) ? rawLedger : [];
    const removedEntries = ledger.filter((item: any) => item?.source === 'task' && item?.sourceId === taskId);
    const remainingLedger = ledger.filter((item: any) => !(item?.source === 'task' && item?.sourceId === taskId));

    // Also find and remove the day-bonus entry for this date from remainingLedger
    const dayBonusEntries = remainingLedger.filter((item: any) => item?.source === 'day-bonus' && item?.sourceId === date);
    const finalLedger = remainingLedger.filter((item: any) => !(item?.source === 'day-bonus' && item?.sourceId === date));

    await setJson(ledgerKey, finalLedger);
    await invalidateReportCache(childId);

    const removedStars = removedEntries.reduce((sum: number, item: any) => sum + (Number(item?.amount) || 0), 0) +
                          dayBonusEntries.reduce((sum: number, item: any) => sum + (Number(item?.amount) || 0), 0);
    const balance = finalLedger.reduce((sum: number, item: any) => sum + (Number(item?.amount) || 0), 0);

    return NextResponse.json({
      task: revertedTask,
      removedStars,
      balance,
    });
  } catch (error) {
    console.error('Error reverting task:', error);
    return NextResponse.json({ error: 'Failed to revert task' }, { status: 500 });
  }
}

function normalizeRevertedTask(task: any) {
  return {
    ...task,
    completed: false,
    completedAt: null,
    difficulty: null,
    detailsOpened: false,
    subtasks: Array.isArray(task?.subtasks)
      ? task.subtasks.map((subtask: any, index: number) => ({
          id: subtask?.id || `subtask-${index}`,
          title: subtask?.title || '',
          done: false,
        }))
      : [],
    updatedAt: new Date().toISOString(),
  };
}

async function getCurrentBalance(childId: string) {
  const ledger = await getJson(`aq:star-ledger:${childId}`);
  return Array.isArray(ledger)
    ? ledger.reduce((sum: number, item: any) => sum + (Number(item?.amount) || 0), 0)
    : 0;
}

async function maybeReactivateOneTimeTemplate(task: any) {
  const templateId = task?.templateId;
  if (!templateId) return;

  const templates = await getJson('aq:task-templates');
  if (!Array.isArray(templates)) return;

  let changed = false;
  const nextTemplates = templates.map((template: any) => {
    if (template?.id !== templateId) return template;
    const repeatDays = Array.isArray(template?.repeatDays) ? template.repeatDays : [];
    if (repeatDays.length > 0) return template;
    if (template.active) return template;
    const revertedDate = normalizeDate(task?.completedAt || task?.date || new Date().toISOString()) || new Date().toISOString().split('T')[0];
    changed = true;
    return {
      ...template,
      active: true,
      oneTimeDate: revertedDate,
      inactiveAt: null,
      updatedAt: new Date().toISOString(),
    };
  });

  if (changed) {
    await setJson('aq:task-templates', nextTemplates);
  }
}

function normalizeDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}
