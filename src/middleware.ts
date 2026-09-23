// Next.js middleware — Clerk authentication gate.
// - Protects the (dashboard) route group and all REST API endpoints.
// - Redirects unauthenticated visitors to the Clerk sign-in page.
// - Redirects authenticated visitors away from auth pages and the home page
//   to /dashboard, preventing the Clerk default redirect loop to "/".
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/projects(.*)',
  '/api/projects(.*)',
  '/api/tasks(.*)',
]);

// Routes that an already-signed-in user should never linger on.
// Visiting these while authenticated sends the user to /dashboard.
const isAuthPage = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // 1) Unauthenticated user hitting a protected route → go sign in.
  if (isProtectedRoute(req) && !userId) {
    const url = new URL('/sign-in', req.nextUrl.origin);
    url.searchParams.set('redirect_url', req.nextUrl.pathname);
    return Response.redirect(url);
  }

  // 2) Authenticated user landing on auth pages or home → go to dashboard.
  //    This prevents Clerk from redirecting them back to "/" (its default
  //    fallback) and breaks the "/ → /sign-in → /" loop.
  if (isAuthPage(req) && userId) {
    return Response.redirect(new URL('/dashboard', req.nextUrl.origin));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
