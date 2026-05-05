import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';

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
    requiresOpenDetails: false,
    detailsText: '',
    subtasksMode: 'none',
    subtasks: [],
    askDifficultyAfterDone: true,
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
    requiresOpenDetails: false,
    detailsText: '',
    subtasksMode: 'none',
    subtasks: [],
    askDifficultyAfterDone: false,
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
    requiresOpenDetails: false,
    detailsText: '',
    subtasksMode: 'none',
    subtasks: [],
    askDifficultyAfterDone: true,
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
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}
