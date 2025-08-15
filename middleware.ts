import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Protected routes that require authentication
const protectedRoutes = ['/portal', '/api/projects', '/api/users'];

// Auth routes that should redirect to portal if already logged in
const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth-token')?.value;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api');

  // Handle protected routes
  if (isProtectedRoute) {
    if (!authToken) {
      // API routes return 401
      if (isApiRoute) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      // Web routes redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify token validity
    try {
      await verifyToken(authToken);
    } catch {
      // Token is invalid or expired
      if (isApiRoute) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Handle auth routes (redirect to portal if already logged in)
  if (isAuthRoute && authToken) {
    // Check for force parameter to allow access even when authenticated (for testing)
    const forceAccess = request.nextUrl.searchParams.get('force') === 'true';

    if (!forceAccess) {
      try {
        await verifyToken(authToken);
        // Token is valid, redirect to portal
        return NextResponse.redirect(new URL('/portal', request.url));
      } catch {
        // Token is invalid, let them proceed to auth page
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with extensions (e.g., .png, .css, .js)
     * - api/auth/* (authentication endpoints - must be public)
     *
     * This ensures middleware runs for:
     * - Protected routes like /portal, /api/projects, /api/users
     * - Auth pages like /login, /signup (for redirect logic)
     * - But NOT for public auth API endpoints
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)',
  ],
};
