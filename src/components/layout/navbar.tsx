import Link from "next/link";
import { Suspense } from "react";
import { NavLinkList, NavLinks } from "@/components/layout/nav-links";
import { TimeZoneCookie } from "@/components/layout/time-zone-cookie";
import { UserMenu } from "@/components/layout/user-menu";
import { SITE_NAME } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

// Sticky top bar for signed-in pages. Hidden during study sessions by the
// [data-focus-mode] rule in globals.css.
export function Navbar() {
  return (
    <header
      data-app-navbar
      className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60"
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/decks" className="font-semibold tracking-tight">
            {SITE_NAME}
          </Link>
          {/* usePathname() can read request data, so it sits behind Suspense. */}
          <Suspense fallback={<NavLinkList />}>
            <NavLinks />
          </Suspense>
        </div>
        {/* Reading the session reads cookies, so it streams in behind Suspense. */}
        <Suspense fallback={<div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />}>
          <CurrentUserMenu />
        </Suspense>
      </div>
      <TimeZoneCookie />
    </header>
  );
}

async function CurrentUserMenu() {
  // Display only: getClaims() verifies the JWT locally (no Auth server call).
  // Each page still runs requireUser(), which is the real check.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims.email === "string" ? data.claims.email : undefined;
  if (!data?.claims) return null;
  return <UserMenu email={email} />;
}
