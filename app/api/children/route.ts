import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';

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
    
    // Update individual profile keys
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
