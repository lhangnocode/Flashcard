import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

const PROTECTED_PREFIXES = ["/dashboard", "/decks", "/study", "/settings"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Runs before every matched request. Refreshes the auth token if needed and
// does optimistic redirects. This is a convenience, not the security boundary:
// requireUser() and RLS are what actually protect data.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Pass refreshed cookies to the page being rendered (request)
          // and back to the browser (response).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // getClaims() verifies the JWT signature against Supabase's public keys
  // (cached), refreshing the session first if it has expired.
  // Don't put code between createServerClient and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  let redirectTo: string | null = null;
  if (!signedIn && isProtected(pathname)) redirectTo = "/login";
  if (signedIn && pathname === "/login") redirectTo = "/dashboard";
  // The landing page is for signed-out visitors; signed-in users go to their decks.
  if (signedIn && pathname === "/") redirectTo = "/decks";

  if (redirectTo) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Keep any refreshed auth cookies on the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
