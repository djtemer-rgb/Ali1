import { NextResponse } from 'next/server';
import { addPushSubscription } from '@/app/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const childId = body.childId === 'said' ? 'said' : 'ali';
    const subscription = body.subscription;

    if (!subscription?.endpoint) {
      return NextResponse.json({ ok: false, error: 'Missing subscription' }, { status: 400 });
    }

    await addPushSubscription(childId, subscription);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ ok: false, error: 'Failed to save subscription' }, { status: 500 });
  }
}
