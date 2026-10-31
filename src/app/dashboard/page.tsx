import { Suspense } from "react";
import { requireUser } from "@/lib/auth";

// Placeholder: proves the sign-in flow works end to end.
export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {/* Reading the user reads cookies, so it streams in behind Suspense. */}
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <SignedInAs />
      </Suspense>
    </main>
  );
}

async function SignedInAs() {
  const user = await requireUser();

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm">Signed in as {user.email}</p>
      <form action="/auth/signout" method="post">
        <button className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
          Sign out
        </button>
      </form>
    </div>
  );
}
