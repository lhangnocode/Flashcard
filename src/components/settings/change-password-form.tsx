"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/(app)/settings/actions";
import { FormError } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation";

export function ChangePasswordForm() {
  // React resets the form's fields after each submission, so passwords
  // don't linger in the inputs.
  const [state, formAction, pending] = useActionState(changePassword, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-4">
      <PasswordField name="current" label="Current password" errors={errors?.current}
        autoComplete="current-password" minLength={1} />
      <PasswordField name="password" label="New password" errors={errors?.password}
        autoComplete="new-password" />
      <PasswordField name="confirm" label="Confirm new password" errors={errors?.confirm}
        autoComplete="new-password" />
      <FormError message={state && !state.ok ? state.error : undefined} />
      {state?.ok ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Password updated.
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

function PasswordField({
  name,
  label,
  errors,
  autoComplete,
  minLength = PASSWORD_MIN_LENGTH,
}: {
  name: string;
  label: string;
  errors?: string[];
  autoComplete: string;
  minLength?: number; // the current password may predate the 8-character rule
}) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="password"
        required
        minLength={minLength}
        autoComplete={autoComplete}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? errorId : undefined}
      />
      {errors?.length ? (
        <p id={errorId} className="text-xs text-destructive">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
