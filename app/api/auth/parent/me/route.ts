import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.AQ_PARENT_SESSION_SECRET || 'default-secret-change-me-in-production'
);

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('parent-session')?.value;
    if (!token) {
      return NextResponse.json({ authorized: false }, { status: 401 });
    }
    await jwtVerify(token, SESSION_SECRET);
    return NextResponse.json({ authorized: true });
  } catch {
    return NextResponse.json({ authorized: false }, { status: 401 });
  }
}
