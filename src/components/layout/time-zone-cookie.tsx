"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const COOKIE = "tz"; // keep in sync with TIME_ZONE_COOKIE in src/lib/time-zone.ts
const ONE_YEAR = 60 * 60 * 24 * 365;

// Saves the browser's time zone in a cookie so the server can compute
// "today" and streaks in local time. When it changes (first visit, travel),
// re-render the page so server data uses the new zone.
export function TimeZoneCookie() {
  const router = useRouter();

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return;
    const current = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1);
    if (current && decodeURIComponent(current) === zone) return;

    document.cookie = `${COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
