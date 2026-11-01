import { BrainIcon, SearchIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/site";

// Signed-in visitors never see this page: proxy.ts redirects "/" to /dashboard.
// It reads no request data, so it's fully prerendered.

const FEATURES = [
  {
    icon: BrainIcon,
    title: "SM-2 spaced repetition",
    body: "Cards come back right before you'd forget them. Missed cards return in the same session.",
  },
  {
    icon: UploadIcon,
    title: "Quizlet text import",
    body: "Paste an exported set, check the preview, and import up to 500 cards at once.",
  },
  {
    icon: SearchIcon,
    title: "Fast Japanese search",
    body: "Find 〜たびに or 間に anywhere in a card, front or back, as you type.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4">
      <header className="flex h-14 items-center justify-between">
        <span className="font-semibold tracking-tight">{SITE_NAME}</span>
        <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Sign in
        </Link>
      </header>

      <section className="grid flex-1 content-center justify-items-center gap-6 py-20 text-center">
        <p className="text-sm font-medium text-muted-foreground">日本語 · 語彙 · 文法</p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Master Japanese with Spaced Repetition
        </h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          Flashcards for vocabulary and grammar that schedule each review for you, so your study
          time goes to the cards you&apos;re about to forget.
        </p>
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Get Started
        </Link>
      </section>

      <section className="grid gap-4 pb-20 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="grid content-start gap-2 rounded-xl border p-5">
            <Icon className="size-5 text-muted-foreground" aria-hidden />
            <h2 className="font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
