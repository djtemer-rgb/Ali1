import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId');
    const type = url.searchParams.get('type');
    const read = url.searchParams.get('read');
    
    let events = await getJson('aq:events:parent') || [];
    
    if (childId) {
      events = events.filter((e: any) => e.childId === childId);
    }
    if (type) {
      events = events.filter((e: any) => e.type === type);
    }
    if (read !== null) {
      const isRead = read === 'true';
      events = events.filter((e: any) => e.read === isRead);
    }
    
    // Sort by newest first
    events.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error getting events:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = await getJson('aq:events:parent') || [];
    
    const newEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      read: false,
      createdAt: new Date().toISOString()
    };
    
    events.push(newEvent);
    await setJson('aq:events:parent', events);
    
    return NextResponse.json(newEvent);
  } catch (error) {
    console.error('Error adding event:', error);
    return NextResponse.json({ error: 'Failed to add event' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    let events = await getJson('aq:events:parent') || [];
    events = events.map((e: any) => 
      e.id === id ? { ...e, ...updates } : e
    );
    
    await setJson('aq:events:parent', events);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    let events = await getJson('aq:events:parent') || [];
    events = events.filter((e: any) => e.id !== id);
    
    await setJson('aq:events:parent', events);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
