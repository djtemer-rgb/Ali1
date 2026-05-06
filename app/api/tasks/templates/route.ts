import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';
import { invalidateReportCache } from '../../report-cache';

const TEMPLATES_KEY = 'aq:task-templates';

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-1',
    childId: 'ali',
    title: 'Прочитать 10 страниц',
    category: 'reading',
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    stars: 2,
    active: true,
    sortOrder: 0,
    requiresOpenDetails: false,
    detailsText: '',
    subtasksMode: 'none',
    subtasks: [],
    askDifficultyAfterDone: true,
    inactiveAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tpl-2',
    childId: 'ali',
    title: 'Собрать портфель',
    category: 'order',
    repeatDays: [0, 1, 2, 3, 4],
    stars: 1,
    active: true,
    sortOrder: 1,
    requiresOpenDetails: false,
    detailsText: '',
    subtasksMode: 'none',
    subtasks: [],
    askDifficultyAfterDone: false,
    inactiveAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tpl-3',
    childId: 'both',
    title: 'Тренировка',
    category: 'sport',
    repeatDays: [1, 3, 5],
    stars: 3,
    active: true,
    sortOrder: 2,
    requiresOpenDetails: false,
    detailsText: '',
    subtasksMode: 'none',
    subtasks: [],
    askDifficultyAfterDone: true,
    inactiveAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET() {
  try {
    let templates = await getJson(TEMPLATES_KEY);
    if (!templates || !Array.isArray(templates)) {
      templates = DEFAULT_TEMPLATES;
      await setJson(TEMPLATES_KEY, templates);
    } else {
      templates = normalizeTemplates(templates);
      await setJson(TEMPLATES_KEY, templates);
    }
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    return NextResponse.json(DEFAULT_TEMPLATES);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const templates = normalizeTemplates(body.templates || body);
    await setJson(TEMPLATES_KEY, templates);
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error saving templates:', error);
    return NextResponse.json({ error: 'Failed to save templates' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
    const childId = body.childId || 'ali';
    const date = body.date || new Date().toISOString().split('T')[0];

    if (!ids.length) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const rawTemplates = await getJson(TEMPLATES_KEY) || [];
    const templates = Array.isArray(rawTemplates) ? rawTemplates.filter((template: any) => !ids.includes(template.id)) : [];
    const normalizedTemplates = normalizeTemplates(templates);
    await setJson(TEMPLATES_KEY, normalizedTemplates);

    const dayKey = `aq:day:${childId}:${date}`;
    const rawDayTasks = await getJson(dayKey);
    if (Array.isArray(rawDayTasks)) {
      const nextDayTasks = rawDayTasks.filter((task: any) => !(ids.includes(task?.templateId) && !task?.completed));
      if (JSON.stringify(nextDayTasks) !== JSON.stringify(rawDayTasks)) {
        await setJson(dayKey, nextDayTasks);
        await invalidateReportCache(childId);
      }
    }

    return NextResponse.json({ success: true, deletedIds: ids, templates: normalizedTemplates });
  } catch (error) {
    console.error('Error deleting templates:', error);
    return NextResponse.json({ error: 'Failed to delete templates' }, { status: 500 });
  }
}

function normalizeTemplates(input: any) {
  const templates = Array.isArray(input) ? input : [];
  return templates.map((template, index) => ({
    id: template.id || `tpl-${Date.now()}-${index}`,
    childId: template.childId || 'ali',
    title: template.title || '',
    category: template.category || 'study',
    customCategory: template.customCategory || '',
    repeatDays: Array.isArray(template.repeatDays) ? template.repeatDays : [],
    dueTime: template.dueTime || '',
    stars: typeof template.stars === 'number' ? template.stars : parseFloat(template.stars || '0') || 0,
    active: template.active !== false,
    sortOrder: Number.isFinite(Number(template.sortOrder)) ? Number(template.sortOrder) : index,
    requiresOpenDetails: !!template.requiresOpenDetails,
    detailsText: template.detailsText || '',
    subtasksMode: template.subtasksMode || 'none',
    subtasks: Array.isArray(template.subtasks)
      ? template.subtasks.map((st: any, stIndex: number) => ({
          id: st.id || `subtask-${index}-${stIndex}`,
          title: st.title || '',
          done: !!st.done
        }))
      : [],
    askDifficultyAfterDone: !!template.askDifficultyAfterDone,
    oneTimeDate: normalizeOneTimeDate(template),
    inactiveAt: template.active === false ? (template.inactiveAt || new Date().toISOString()) : null,
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })).sort((a, b) => {
    const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 9999;
    const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 9999;
    return orderA - orderB || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function normalizeOneTimeDate(template: any) {
  const repeatDays = Array.isArray(template?.repeatDays) ? template.repeatDays : [];
  if (repeatDays.length > 0) return undefined;

  const candidate = template?.oneTimeDate || template?.createdAt || new Date().toISOString();
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return parsed.toISOString().split('T')[0];
}
