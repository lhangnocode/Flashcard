import { cookies } from "next/headers";

export const TIME_ZONE_COOKIE = "tz";

// The browser's IANA time zone (e.g. "Asia/Ho_Chi_Minh"), stored in a cookie
// by <TimeZoneCookie />. Cookies are user input, so anything that isn't a
// zone this runtime knows falls back to UTC.
export async function getTimeZone() {
  const value = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  if (!value || value.length > 64) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}
