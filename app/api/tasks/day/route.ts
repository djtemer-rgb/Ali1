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
    let dayTasks = await getJson(key);
    const dayOfWeek = new Date(date).getDay();

    // Get all active templates for this child
    const templates = await getJson('aq:task-templates') || [];
    const relevantTemplates = Array.isArray(templates)
      ? templates.filter((t: any) =>
          t.active &&
          (t.childId === childId || t.childId === 'both') &&
          t.repeatDays.includes(dayOfWeek)
        )
      : [];

    if (!dayTasks || !Array.isArray(dayTasks) || force) {
      dayTasks = relevantTemplates.map((t: any) => createTaskInstance(t, childId, date));
      await setJson(key, dayTasks);
    } else {
      dayTasks = reconcileDayTasks(dayTasks, relevantTemplates, childId, date);
      const existingTemplateIds = new Set(
        dayTasks.map((t: any) => t.templateId).filter(Boolean)
      );
      const newTemplates = relevantTemplates.filter(
        (t: any) => !existingTemplateIds.has(t.id)
      );
      if (newTemplates.length > 0) {
        const newTasks = newTemplates.map((t: any) => createTaskInstance(t, childId, date));
        dayTasks = [...dayTasks, ...newTasks];
        await setJson(key, dayTasks);
      }
    }

    return NextResponse.json(dayTasks);
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
    subtasks: Array.isArray(template.subtasks)
      ? template.subtasks.map((st: any, index: number) => ({
          id: st.id || `subtask-${index}`,
          title: st.title || '',
          done: !!st.done
        }))
      : [],
    askDifficultyAfterDone: template.askDifficultyAfterDone || false,
    difficulty: null,
    createdAt: new Date().toISOString()
  };
}

function normalizeTaskState(task: any) {
  return {
    ...task,
    subtasks: Array.isArray(task.subtasks)
      ? task.subtasks.map((st: any, index: number) => ({
          id: st.id || `subtask-${index}`,
          title: st.title || '',
          done: !!st.done
        }))
      : [],
  };
}

function reconcileDayTasks(dayTasks: any[], templates: any[], childId: string, date: string) {
  const templateMap = new Map(templates.map((template: any) => [template.id, template]));
  return dayTasks.map((task: any) => {
    const template = task.templateId ? templateMap.get(task.templateId) : null;
    if (!template) return normalizeTaskState(task);
    const mergedSubtasks = mergeSubtasks(task.subtasks, template.subtasks);
    return {
      ...task,
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
      subtasks: mergedSubtasks,
      askDifficultyAfterDone: !!template.askDifficultyAfterDone,
      updatedAt: new Date().toISOString()
    };
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
