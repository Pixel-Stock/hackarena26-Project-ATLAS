import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/* ============================================================
   ATLAS — Auth Middleware
   Protects routes and refreshes sessions.
   Runs on Edge Runtime (no bcrypt, no Node.js APIs).
   ============================================================ */

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/'];
const ADMIN_ROUTES = ['/admin'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Create Supabase client for middleware
    let response = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        // If Supabase isn't configured, allow all routes (dev mode)
        return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                );
                response = NextResponse.next({
                    request: { headers: request.headers },
                });
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                );
            },
        },
    });

    // Refresh session
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Allow public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
        // Redirect to dashboard if already authenticated
        if (user && (pathname === '/login' || pathname === '/signup')) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return response;
    }

    // Protect admin routes
    if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // Check admin role via profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        return response;
    }

    // Protect all other routes
    if (!user) {
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public files (images, etc.)
         * - API routes (handled by their own auth)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)',
    ],
};
