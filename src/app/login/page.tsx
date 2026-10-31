import { Suspense } from "react";
import { signIn, signUp } from "./actions";

// Fixed messages keyed by code, so the URL can't inject arbitrary text.
const MESSAGES: Record<string, { text: string; isError: boolean }> = {
  missing_fields: { text: "Enter your email and password.", isError: true },
  invalid_credentials: { text: "Wrong email or password.", isError: true },
  signup_failed: {
    text: "Couldn't create the account. The email may already be registered, or the password is too short.",
    isError: true,
  },
  auth_callback_failed: {
    text: "That sign-in link is invalid or expired.",
    isError: true,
  },
  check_email: {
    text: "Check your email to confirm your account.",
    isError: false,
  },
};

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      {/* searchParams is request data, so it streams in behind Suspense. */}
      <Suspense fallback={null}>
        <StatusMessage searchParams={props.searchParams} />
      </Suspense>

      <form className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={6}
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <div className="flex gap-2">
          <button
            formAction={signIn}
            className="flex-1 rounded bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Sign in
          </button>
          <button
            formAction={signUp}
            className="flex-1 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700"
          >
            Sign up
          </button>
        </div>
      </form>
    </main>
  );
}

async function StatusMessage({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  const code =
    typeof params.error === "string"
      ? params.error
      : typeof params.message === "string"
        ? params.message
        : null;
  const message = code ? MESSAGES[code] : undefined;
  if (!message) return null;

  return (
    <p
      role={message.isError ? "alert" : "status"}
      className={message.isError ? "text-sm text-red-600" : "text-sm text-green-700"}
    >
      {message.text}
    </p>
  );
}
