"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/settings/actions";
import { FormError } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  // React resets the form's fields after each submission, so passwords
  // don't linger in the inputs.
  const [state, formAction, pending] = useActionState(changePassword, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-4">
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
}: {
  name: string;
  label: string;
  errors?: string[];
  autoComplete: string;
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
        minLength={8}
        maxLength={72}
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
