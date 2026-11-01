import type { Metadata } from "next";
import { Suspense } from "react";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Account settings" };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

export default function SettingsPage() {
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Account settings</h1>

      <section className="grid gap-3 rounded-xl border p-5">
        <h2 className="font-medium">Account</h2>
        {/* Reading the user reads cookies, so it streams in behind Suspense. */}
        <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-muted/50" />}>
          <AccountDetails />
        </Suspense>
      </section>

      <section className="grid gap-4 rounded-xl border p-5">
        <div className="grid gap-1">
          <h2 className="font-medium">Change password</h2>
          <p className="text-sm text-muted-foreground">At least 8 characters.</p>
        </div>
        <ChangePasswordForm />
      </section>
    </main>
  );
}

async function AccountDetails() {
  const user = await requireUser();
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
      <dt className="text-muted-foreground">Email</dt>
      <dd className="break-all">{user.email ?? "—"}</dd>
      <dt className="text-muted-foreground">Member since</dt>
      <dd>{dateFormat.format(new Date(user.createdAt))}</dd>
    </dl>
  );
}
