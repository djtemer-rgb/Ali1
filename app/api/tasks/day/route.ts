import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';
import { invalidateReportCache } from '../../report-cache';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const childId = url.searchParams.get('childId') || 'ali';
    const force = url.searchParams.get('force') === 'true';

    const key = `aq:day:${childId}:${date}`;
    const rawDayTasks = await getJson(key);
    const existingDayTasks = Array.isArray(rawDayTasks) ? rawDayTasks : [];
    const dayOfWeek = new Date(date).getDay();

    const rawTemplates = await getJson('aq:task-templates') || [];
    const templates = Array.isArray(rawTemplates) ? normalizeTemplates(rawTemplates) : [];
    const relevantTemplates = templates.filter((template: any) =>
      template.active &&
      (template.childId === childId || template.childId === 'both') &&
      isTemplateScheduledForDate(template, date, dayOfWeek)
    );

    let nextDayTasks: any[] = [];

    if (!existingDayTasks.length || force) {
      nextDayTasks = relevantTemplates.map((template: any) => createTaskInstance(template, childId, date));
    } else {
      const reconciled = reconcileDayTasks(existingDayTasks, relevantTemplates, childId, date);
      const existingTemplateIds = new Set(
        reconciled
          .map((task: any) => task?.templateId)
          .filter(Boolean)
      );
      const missingTemplates = relevantTemplates.filter((template: any) => !existingTemplateIds.has(template.id));
      nextDayTasks = [
        ...reconciled,
        ...missingTemplates.map((template: any) => createTaskInstance(template, childId, date)),
      ];
    }

    const normalizedNext = sortDayTasks(
      nextDayTasks.map(normalizeTaskState),
      templates,
    );
    const normalizedExisting = sortDayTasks(
      existingDayTasks.map(normalizeTaskState),
      templates,
    );
    if (JSON.stringify(normalizedNext) !== JSON.stringify(normalizedExisting)) {
      await setJson(key, normalizedNext);
    }

    return NextResponse.json(normalizedNext);
  } catch (error) {
    console.error('Error getting day tasks:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, date, tasks } = body;
    const key = `aq:day:${childId}:${date}`;
    const normalized = Array.isArray(tasks) ? tasks.map(normalizeTaskState) : [];
    await setJson(key, normalized);
    await invalidateReportCache(childId);
    return NextResponse.json(normalized);
  } catch (error) {
    console.error('Error saving day tasks:', error);
    return NextResponse.json({ error: 'Failed to save tasks' }, { status: 500 });
  }
}

function createTaskInstance(template: any, childId: string, date: string) {
  const repeatDays = Array.isArray(template.repeatDays) ? template.repeatDays : [];
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    templateId: template.id,
    childId,
    date,
    title: template.title,
    category: template.category,
    customCategory: template.customCategory || '',
    stars: template.stars,
    dueTime: template.dueTime || null,
    completed: false,
    completedAt: null,
    detailsOpened: false,
    requiresOpenDetails: template.requiresOpenDetails || false,
    detailsText: template.detailsText || '',
    subtasksMode: template.subtasksMode || 'none',
    oneTimeDate: repeatDays.length === 0 ? template.oneTimeDate || date : null,
    subtasks: Array.isArray(template.subtasks)
      ? template.subtasks.map((st: any, index: number) => ({
          id: st.id || `subtask-${index}`,
          title: st.title || '',
          done: !!st.done
        }))
      : [],
    askDifficultyAfterDone: template.askDifficultyAfterDone || false,
    difficulty: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeTaskState(task: any) {
  return {
    ...task,
    completed: !!task.completed,
    completedAt: task.completedAt || null,
    detailsOpened: !!task.detailsOpened,
    subtasks: Array.isArray(task.subtasks)
      ? task.subtasks.map((st: any, index: number) => ({
          id: st.id || `subtask-${index}`,
          title: st.title || '',
          done: !!st.done
        }))
      : [],
  };
}

function sortDayTasks(tasks: any[], templates: any[]) {
  const templateOrder = new Map(
    (Array.isArray(templates) ? templates : []).map((template: any) => [
      template.id,
      Number.isFinite(Number(template?.sortOrder)) ? Number(template.sortOrder) : 9999,
    ]),
  );

  return [...tasks].sort((a: any, b: any) => {
    const orderA = a?.templateId && templateOrder.has(a.templateId)
      ? Number(templateOrder.get(a.templateId))
      : 9999;
    const orderB = b?.templateId && templateOrder.has(b.templateId)
      ? Number(templateOrder.get(b.templateId))
      : 9999;
    if (orderA !== orderB) return orderA - orderB;

    const timeA = new Date(a?.oneTimeDate || a?.createdAt || 0).getTime();
    const timeB = new Date(b?.oneTimeDate || b?.createdAt || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;

    return String(a?.title || '').localeCompare(String(b?.title || ''), 'ru');
  });
}

function reconcileDayTasks(dayTasks: any[], templates: any[], childId: string, date: string) {
  const templateMap = new Map(templates.map((template: any) => [template.id, template]));
  return dayTasks
    .map((task: any) => {
      const normalizedTask = normalizeTaskState(task);
      const template = normalizedTask.templateId ? templateMap.get(normalizedTask.templateId) : null;

      if (!template) {
        return normalizedTask.completed ? normalizedTask : null;
      }

      const templateStillRelevant = isTemplateScheduledForDate(template, date, new Date(date).getDay());
      if (!templateStillRelevant && !normalizedTask.completed) {
        return null;
      }

      if (normalizedTask.completed) {
        return {
          ...normalizedTask,
          childId,
          date,
          updatedAt: normalizedTask.updatedAt || new Date().toISOString(),
        };
      }

      const mergedSubtasks = mergeSubtasks(normalizedTask.subtasks, template.subtasks);
      return {
        ...normalizedTask,
        childId,
        date,
        title: template.title,
        category: template.category,
        customCategory: template.customCategory || '',
        stars: template.stars,
        dueTime: template.dueTime || null,
        requiresOpenDetails: !!template.requiresOpenDetails,
        detailsText: template.detailsText || '',
        subtasksMode: template.subtasksMode || 'none',
        oneTimeDate: template.oneTimeDate || normalizedTask.oneTimeDate || null,
        subtasks: mergedSubtasks,
        askDifficultyAfterDone: !!template.askDifficultyAfterDone,
        updatedAt: new Date().toISOString()
      };
    })
    .filter(Boolean);
}

function normalizeTemplates(input: any[]) {
  return input
    .map((template, index) => ({
      ...template,
      sortOrder: Number.isFinite(Number(template?.sortOrder)) ? Number(template.sortOrder) : index,
      active: template?.active !== false,
      inactiveAt: template?.inactiveAt || null,
      oneTimeDate: normalizeOneTimeDate(template),
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: template?.updatedAt || new Date().toISOString()
    }))
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 9999;
      const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 9999;
      return orderA - orderB || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

function mergeSubtasks(current: any[], templateSubtasks: any[]) {
  const currentMap = new Map((Array.isArray(current) ? current : []).map((st: any) => [st.id || st.title, st]));
  return (Array.isArray(templateSubtasks) ? templateSubtasks : []).map((templateSubtask: any, index: number) => {
    const key = templateSubtask.id || templateSubtask.title || `subtask-${index}`;
    const existing = currentMap.get(key);
    return {
      id: templateSubtask.id || key,
      title: templateSubtask.title || '',
      done: existing ? !!existing.done : !!templateSubtask.done
    };
  });
}

function isTemplateScheduledForDate(template: any, date: string, dayOfWeek: number) {
  const repeatDays = Array.isArray(template?.repeatDays) ? template.repeatDays : [];
  if (repeatDays.length > 0) {
    return repeatDays.includes(dayOfWeek);
  }

  const oneTimeDate = normalizeDate(template?.oneTimeDate || template?.createdAt);
  return !!oneTimeDate && oneTimeDate === date;
}

function normalizeOneTimeDate(template: any) {
  const repeatDays = Array.isArray(template?.repeatDays) ? template.repeatDays : [];
  if (repeatDays.length > 0) return template?.oneTimeDate || undefined;

  const candidate = template?.oneTimeDate || template?.createdAt || new Date().toISOString();
  const normalized = normalizeDate(candidate);
  return normalized || new Date().toISOString().split('T')[0];
}

function normalizeDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}
