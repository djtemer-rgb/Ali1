import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.AQ_PARENT_SESSION_SECRET || 'default-secret-change-me-in-production'
);

async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SESSION_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    (pathname.startsWith('/parent') && pathname !== '/parent/login') ||
    pathname.startsWith('/settings')
  ) {
    const session = request.cookies.get('parent-session');

    if (!session || !(await verifySession(session.value))) {
      const loginUrl = new URL('/parent/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/parent/:path*', '/settings/:path*']
};
