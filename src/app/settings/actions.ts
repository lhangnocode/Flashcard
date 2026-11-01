"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ActionState } from "@/lib/validation";

// Passwords are NOT trimmed: spaces are valid password characters.
// 72 is the most bcrypt (which Supabase Auth uses) can hash.
const passwordSchema = z
  .object({
    password: z.string().min(8, "At least 8 characters").max(72, "At most 72 characters"),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  const parsed = passwordSchema.safeParse({
    password: formData.get("password") ?? "",
    confirm: formData.get("confirm") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, error: "New password must be different from your current one." };
    }
    if (error.code === "weak_password") return { ok: false, error: error.message };
    console.error("changePassword", error);
    return { ok: false, error: "Something went wrong. Try again." };
  }
  return { ok: true };
}
