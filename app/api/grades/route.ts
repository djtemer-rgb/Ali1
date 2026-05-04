import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';

const DEFAULT_SUBJECTS = [
  { id: 'subj-1', name: 'Математика', order: 1 },
  { id: 'subj-2', name: 'Русский язык', order: 2 },
  { id: 'subj-3', name: 'Чтение', order: 3 },
  { id: 'subj-4', name: 'Окружающий мир', order: 4 },
  { id: 'subj-5', name: 'Английский язык', order: 5 }
];

const DEFAULT_GRADES: any[] = [];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId') || 'ali';
    const date = url.searchParams.get('date');
    
    const grades = await getJson('aq:grades') || DEFAULT_GRADES;
    let filtered = grades.filter((g: any) => g.childId === childId);
    
    if (date) {
      filtered = filtered.filter((g: any) => g.date === date);
    }
    
    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error getting grades:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const grades = await getJson('aq:grades') || [];
    
    // Add new grade
    const newGrade = {
      id: `grade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      createdAt: new Date().toISOString()
    };
    
    grades.push(newGrade);
    await setJson('aq:grades', grades);
    
    // Award stars based on grade
    const settings = await getJson('aq:settings');
    const gradeToStars = settings?.gradeToStars || { '5': 5, '4': 2, '3': 0, '2': 0 };
    const starsAwarded = gradeToStars[body.grade.toString()] || 0;
    
    if (starsAwarded > 0) {
      await addStarLedgerItem({
        childId: body.childId,
        amount: starsAwarded,
        source: 'grade',
        sourceId: newGrade.id,
        reason: `Оценка ${body.grade} по предмету ${body.subjectName}`
      });
    }
    
    return NextResponse.json(newGrade);
  } catch (error) {
    console.error('Error saving grade:', error);
    return NextResponse.json({ error: 'Failed to save grade' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { subjects } = body;
    
    if (subjects) {
      await setJson('aq:subjects', subjects);
      return NextResponse.json(subjects);
    }
    
    return NextResponse.json({ error: 'No subjects provided' }, { status: 400 });
  } catch (error) {
    console.error('Error saving subjects:', error);
    return NextResponse.json({ error: 'Failed to save subjects' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    let grades = await getJson('aq:grades') || [];
    grades = grades.filter((g: any) => g.id !== id);
    await setJson('aq:grades', grades);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting grade:', error);
    return NextResponse.json({ error: 'Failed to delete grade' }, { status: 500 });
  }
}

// Helper to add star ledger item
async function addStarLedgerItem(item: any) {
  const ledger = await getJson(`aq:star-ledger:${item.childId}`) || [];
  ledger.push({
    id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...item,
    date: item.date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  });
  await setJson(`aq:star-ledger:${item.childId}`, ledger);
}
