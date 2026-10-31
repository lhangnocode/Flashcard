import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | undefined;
};

// The secure auth check. Call it at the top of every protected page and
// Server Action. getUser() asks the Supabase Auth server, so a forged or
// revoked token is rejected here even if it got past proxy.ts.
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Return only what callers need, not the full user object.
  return { id: user.id, email: user.email };
}
