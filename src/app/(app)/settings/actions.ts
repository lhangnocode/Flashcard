"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/supabase/verify-password";
import { type ActionResult, type ActionState, newPasswordSchema } from "@/lib/validation";

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

const FAILED = { ok: false, error: "Something went wrong. Try again." } as const;

export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse({
    current: formData.get("current") ?? "",
    password: formData.get("password") ?? "",
    confirm: formData.get("confirm") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  if (!user.email) return FAILED; // every account here signs in by email

  // Someone using a session left signed in doesn't know the password.
  const check = await verifyPassword(user.email, parsed.data.current);
  if (check === "wrong") {
    return { ok: false, fieldErrors: { current: ["Incorrect current password."] } };
  }
  if (check === "rate_limited") {
    return { ok: false, error: "Too many attempts. Wait a few minutes and try again." };
  }
  if (check === "error") return FAILED;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, error: "New password must be different from your current one." };
    }
    if (error.code === "weak_password") return { ok: false, error: error.message };
    console.error("changePassword", error);
    return FAILED;
  }
  return { ok: true };
}
