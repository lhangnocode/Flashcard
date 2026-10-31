"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signIn(formData: FormData) {
  const { email, password } = readCredentials(formData);
  if (!email || !password) redirect("/login?error=missing_fields");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=invalid_credentials");

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const { email, password } = readCredentials(formData);
  if (!email || !password) redirect("/login?error=missing_fields");

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Where the confirmation email link sends the user (hosted Supabase).
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect("/login?error=signup_failed");

  // With email confirmation on, there's no session until the link is clicked.
  if (!data.session) redirect("/login?message=check_email");

  redirect("/dashboard");
}
