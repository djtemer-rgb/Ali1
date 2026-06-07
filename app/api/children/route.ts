import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';

export const dynamic = 'force-dynamic';

const CHILDREN_KEY = 'aq:children';

const DEFAULT_CHILDREN = [
  {
    id: 'ali',
    name: 'Али',
    mode: 'full',
    avatarLetter: 'А',
    favoriteHeroes: ['Мухаммед Али', 'Роналду', 'Тайсон'],
    hideGradesInChildHome: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'said',
    name: 'Саид',
    mode: 'little-hero',
    avatarLetter: 'С',
    favoriteHeroes: ['Мухаммед Али', 'Роналду'],
    hideGradesInChildHome: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET() {
  try {
    let children = await getJson(CHILDREN_KEY);
    if (!children || !Array.isArray(children) || children.length === 0) {
      children = DEFAULT_CHILDREN;
      await setJson(CHILDREN_KEY, children);
      
      // Also create individual profile keys
      for (const child of children) {
        await setJson(`aq:child:${child.id}:profile`, child);
      }
    }
    return NextResponse.json(children);
  } catch (error) {
    console.error('Error getting children:', error);
    return NextResponse.json(DEFAULT_CHILDREN);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const children = body.children || body;
    await setJson(CHILDREN_KEY, children);
    
    if (Array.isArray(children)) {
      for (const child of children) {
        await setJson(`aq:child:${child.id}:profile`, child);
      }
    }
    
    return NextResponse.json(children);
  } catch (error) {
    console.error('Error saving children:', error);
    return NextResponse.json({ error: 'Failed to save children' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
    
    const children = await getJson(CHILDREN_KEY) || DEFAULT_CHILDREN;
    const updatedChildren = Array.isArray(children)
      ? children.map((c: any) => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)
      : children;
    
    await setJson(CHILDREN_KEY, updatedChildren);
    const updated = Array.isArray(updatedChildren) ? updatedChildren.find((c: any) => c.id === id) : null;
    if (updated) await setJson(`aq:child:${id}:profile`, updated);
    
    return NextResponse.json(updated || updatedChildren);
  } catch (error) {
    console.error('Error updating child:', error);
    return NextResponse.json({ error: 'Failed to update child' }, { status: 500 });
  }
}
