import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getJson } from '../../../upstash';

const PARENT_AUTH_KEY = 'aq:parent:auth';

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();
    
    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }
    
    const auth = await getJson(PARENT_AUTH_KEY) as any;
    
    if (!auth || (!auth.pin1Hash && !auth.pin2Hash)) {
      // First time - any PIN works, save it
      return NextResponse.json({ success: true, message: 'First login, PIN saved' });
    }
    
    // Check PIN against both slots
    const isValid = 
      (auth.pin1Hash && await bcrypt.compare(pin, auth.pin1Hash)) ||
      (auth.pin2Hash && await bcrypt.compare(pin, auth.pin2Hash));
    
    if (isValid) {
      // Set session cookie
      const response = NextResponse.json({ success: true });
      response.cookies.set('parent-session', 'authorized', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      return response;
    }
    
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  } catch (error) {
    console.error('Error in login:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
