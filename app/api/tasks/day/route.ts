import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const childId = url.searchParams.get('childId') || 'ali';
    
    const key = `aq:day:${childId}:${date}`;
    let dayTasks = await getJson(key);
    
    if (!dayTasks || !Array.isArray(dayTasks)) {
      // Generate tasks from templates
      const templates = await getJson('aq:task-templates') || [];
      const dayOfWeek = new Date(date).getDay(); // 0=Sunday, 1=Monday...
      
      dayTasks = templates
        .filter((t: any) => 
          t.active && 
          (t.childId === childId || t.childId === 'both') &&
          t.repeatDays.includes(dayOfWeek)
        )
        .map((t: any) => ({
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          templateId: t.id,
          childId: childId,
          date: date,
          title: t.title,
          category: t.category,
          stars: t.stars,
          dueTime: t.dueTime || null,
          completed: false,
          completedAt: null,
          detailsOpened: false,
          requiresOpenDetails: t.requiresOpenDetails,
          subtasksMode: t.subtasksMode,
          subtasks: t.subtasks || [],
          difficulty: null,
          createdAt: new Date().toISOString()
        }));
      
      await setJson(key, dayTasks);
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
