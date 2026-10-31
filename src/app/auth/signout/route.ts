import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST only: a GET sign-out could be triggered by link prefetching.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 turns the POST into a GET on /login.
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
