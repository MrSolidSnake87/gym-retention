import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/signup'];

  // Skip middleware for public routes and static files
  if (publicRoutes.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Protected routes - require authentication
  const protectedRoutes = ['/', '/dashboard', '/api/members', '/api/upload', '/api/actions', '/api/analyze'];

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    // Get token from cookies or headers
    const token = request.cookies.get('auth_token')?.value ||
                  request.headers.get('authorization')?.split(' ')[1];

    if (!token) {
      // Redirect to login if no token
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/auth/login';
      return NextResponse.redirect(loginUrl);
    }

    // Verify token
    const decoded = await verifyToken(token);
    if (!decoded) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/auth/login';
      return NextResponse.redirect(loginUrl);
    }

    // Token is valid, continue to the route
    // Add gym_id to headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-gym-id', decoded.gym_id);
    response.headers.set('x-user-id', decoded.user_id);
    return response;
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
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
