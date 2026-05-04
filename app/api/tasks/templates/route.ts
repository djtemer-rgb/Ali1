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
    const templates = body.templates || body;
    await setJson(TEMPLATES_KEY, templates);
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error saving templates:', error);
    return NextResponse.json({ error: 'Failed to save templates' }, { status: 500 });
  }
}
