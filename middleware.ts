import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protect parent routes
  if (pathname.startsWith('/parent') || pathname.startsWith('/settings')) {
    const session = request.cookies.get('parent-session');
    
    if (!session || session.value !== 'authorized') {
      return NextResponse.redirect(new URL('/parent/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/parent/:path*', '/settings/:path*']
};
