// Server only: imported by Server Actions (src/app/settings/actions.ts).
import { createClient } from "@supabase/supabase-js";

export type PasswordCheck = "ok" | "wrong" | "rate_limited" | "error";

// Checks a password without touching the signed-in session. The normal server
// client would write the new session into the user's cookies; this throwaway
// client keeps nothing, and the session it creates is ended right away.
export async function verifyPassword(email: string, password: string): Promise<PasswordCheck> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") return "wrong";
    if (error.code === "over_request_rate_limit" || error.status === 429) return "rate_limited";
    console.error("verifyPassword", error);
    return "error";
  }
  // scope "local" ends only this check's session. The default, "global",
  // would sign the user out on every device.
  await supabase.auth.signOut({ scope: "local" });
  return "ok";
}
