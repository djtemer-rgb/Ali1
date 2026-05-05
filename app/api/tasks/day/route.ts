import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';

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
      // Generate fresh
      dayTasks = relevantTemplates.map((t: any) => createTaskInstance(t, childId, date));
      await setJson(key, dayTasks);
    } else {
      // Merge: add templates that are not yet in dayTasks
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
    await setJson(key, tasks);
    return NextResponse.json(tasks);
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
    stars: template.stars,
    dueTime: template.dueTime || null,
    completed: false,
    completedAt: null,
    detailsOpened: false,
    requiresOpenDetails: template.requiresOpenDetails || false,
    detailsText: template.detailsText || '',
    subtasksMode: template.subtasksMode || 'none',
    subtasks: template.subtasks || [],
    askDifficultyAfterDone: template.askDifficultyAfterDone || false,
    difficulty: null,
    createdAt: new Date().toISOString()
  };
}
