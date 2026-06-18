import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getJson, setJson } from '../../../upstash';

const PARENT_AUTH_KEY = 'aq:parent:auth';
const SESSION_SECRET = new TextEncoder().encode(
  process.env.AQ_PARENT_SESSION_SECRET || 'default-secret-change-me-in-production'
);

async function createSessionToken(): Promise<string> {
  return await new SignJWT({ role: 'parent', authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SESSION_SECRET);
}

export async function POST(request: Request) {
  try {
    const { pin, recoveryWord, bypass } = await request.json();
    
    if (process.env.NODE_ENV !== 'production' && bypass === true) {
      const sessionToken = await createSessionToken();
      const response = NextResponse.json({ success: true, message: 'Bypassed login in development mode' });
      response.cookies.set('parent-session', sessionToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7
      });
      return response;
    }
    
    if (!pin && !recoveryWord) {
      return NextResponse.json({ error: 'PIN или recovery слово обязательны' }, { status: 400 });
    }
    
    const auth = (await getJson(PARENT_AUTH_KEY)) as any || {};
    const hasNoPins = !auth.pin1Hash && !auth.pin2Hash && !auth.recoveryWordHash;
    
    if (hasNoPins && pin) {
      const pinHash = await bcrypt.hash(pin, 10);
      auth.pin1Hash = pinHash;
      auth.updatedAt = new Date().toISOString();
      await setJson(PARENT_AUTH_KEY, auth);
      
      const sessionToken = await createSessionToken();
      const response = NextResponse.json({ success: true, message: 'PIN saved' });
      response.cookies.set('parent-session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7
      });
      return response;
    }
    
    let isValid = false;
    
    if (pin) {
      isValid =
        (auth.pin1Hash && await bcrypt.compare(pin, auth.pin1Hash)) ||
        (auth.pin2Hash && await bcrypt.compare(pin, auth.pin2Hash));
    }
    
    if (!isValid && recoveryWord && auth.recoveryWordHash) {
      isValid = await bcrypt.compare(recoveryWord, auth.recoveryWordHash);
    }
    
    if (isValid) {
      const sessionToken = await createSessionToken();
      const response = NextResponse.json({ success: true });
      response.cookies.set('parent-session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7
      });
      return response;
    }
    
    return NextResponse.json({ error: 'Неверный PIN или recovery слово' }, { status: 401 });
  } catch (error) {
    console.error('Error in login:', error);
    return NextResponse.json({ error: 'Ошибка входа' }, { status: 500 });
  }
}
