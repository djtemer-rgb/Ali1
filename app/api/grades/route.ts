import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';
import { invalidateReportCache } from '../report-cache';
import { defaultGradeToStars, defaultSubjects, getChildSettings, normalizeSubjects } from '@/app/lib/settings-shared';

const DEFAULT_GRADES: any[] = [];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'subjects';
    const childId = (url.searchParams.get('childId') || 'ali') as 'ali' | 'said';
    const settings = await getJson('aq:settings');
    const childSettings = getChildSettings(settings, childId);

    if (type === 'grades') {
      const date = url.searchParams.get('date');
      const grades = await getJson('aq:grades') || DEFAULT_GRADES;
      const gradeToStars = childSettings.gradeToStars || defaultGradeToStars();
      let filtered = grades.filter((g: any) => g.childId === childId);
      if (date) filtered = filtered.filter((g: any) => g.date === date);
      return NextResponse.json(filtered.map((grade: any) => ({
        ...grade,
        starsAwarded: typeof grade.starsAwarded === 'number'
          ? grade.starsAwarded
          : (gradeToStars[String(grade.grade)] ?? 0),
      })));
    }

    return NextResponse.json(childSettings.subjects?.length > 0 ? childSettings.subjects : normalizeSubjects(defaultSubjects()));
  } catch (error) {
    console.error('Error getting grades/subjects:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const grades = await getJson('aq:grades') || [];

    const newGrade = {
      id: `grade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      createdAt: new Date().toISOString(),
    };

    grades.push(newGrade);
    await setJson('aq:grades', grades);

    const settings = await getJson('aq:settings');
    const childSettings = getChildSettings(settings, body.childId as 'ali' | 'said');
    const gradeToStars = childSettings.gradeToStars || defaultGradeToStars();
    const starsAwarded = gradeToStars[body.grade.toString()] || 0;
    newGrade.starsAwarded = starsAwarded;

    if (starsAwarded !== 0) {
      await addStarLedgerItem({
        childId: body.childId,
        amount: starsAwarded,
        source: 'grade',
        sourceId: newGrade.id,
        reason: `Оценка ${body.grade} по предмету ${body.subjectName} (${starsAwarded >= 0 ? '+' : ''}${starsAwarded} ⭐)`,
      });
    }

    await invalidateReportCache(body.childId);

    try {
      const events = await getJson('aq:events:parent') || [];
      events.push({
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        childId: body.childId,
        type: 'grade-added',
        title: 'Оценка добавлена',
        body: `${body.childId === 'ali' ? 'Али' : 'Саид'} получил оценку ${body.grade} по предмету ${body.subjectName}${starsAwarded !== 0 ? ` (${starsAwarded >= 0 ? '+' : ''}${starsAwarded} ⭐)` : ''}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
      await setJson('aq:events:parent', events);
    } catch (e) {
      console.error('Error creating grade event:', e);
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
    const { subjects, childId = 'ali' } = body;

    if (subjects) {
      const normalized = normalizeSubjects(subjects);
      const settings = await getJson('aq:settings') || {};
      const current = getChildSettings(settings, childId);
      settings.childSettings = settings.childSettings || {};
      settings.childSettings[childId] = {
        ...current,
        subjects: normalized,
      };
      settings.subjects = childId === 'ali' ? normalized : settings.subjects || defaultSubjects();
      await setJson('aq:settings', settings);
      return NextResponse.json(normalized);
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
    const gradeToRemove = grades.find((g: any) => g.id === id);
    grades = grades.filter((g: any) => g.id !== id);
    await setJson('aq:grades', grades);

    await invalidateReportCache(gradeToRemove?.childId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting grade:', error);
    return NextResponse.json({ error: 'Failed to delete grade' }, { status: 500 });
  }
}

async function addStarLedgerItem(item: any) {
  const ledger = await getJson(`aq:star-ledger:${item.childId}`) || [];
  ledger.push({
    id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...item,
    date: item.date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  });
  await setJson(`aq:star-ledger:${item.childId}`, ledger);
  await invalidateReportCache(item.childId);
}
