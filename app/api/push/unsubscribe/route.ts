import { NextResponse } from 'next/server';
import { removePushSubscription } from '@/app/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const childId = body.childId === 'said' ? 'said' : 'ali';
    await removePushSubscription(childId, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json({ ok: false, error: 'Failed to remove subscription' }, { status: 500 });
  }
}
