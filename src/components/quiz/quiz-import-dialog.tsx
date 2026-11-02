"use client";

import { UploadIcon } from "lucide-react";
import { useDeferredValue, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { importQuizQuestions } from "@/app/(app)/decks/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseQuizImport } from "@/lib/quiz-parse";
import { MAX_IMPORT_BYTES, MAX_QUIZ_IMPORT } from "@/lib/validation";

const PREVIEW_ROWS = 3;
const LETTERS = ["A", "B", "C", "D"];

export function QuizImportDialog({
  deckId,
  existingCount,
  variant = "outline",
}: {
  deckId: string;
  existingCount: number; // questions already in the deck (for "Replace")
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} />}>
        <UploadIcon /> Import quiz
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import quiz questions</DialogTitle>
          <DialogDescription>
            One question per line:{" "}
            <code className="text-xs">
              Question | Option 1 | Option 2 | Option 3 | Option 4 | Answer | Explanation
            </code>
            . Answer is 1–4 or A–D; the explanation is optional, may contain “|”, and{" "}
            <code className="text-xs">\n</code> starts a new line. Lines starting with # are
            ignored.
          </DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so the form starts empty. */}
        {open ? (
          <ImportForm deckId={deckId} existingCount={existingCount} onDone={() => setOpen(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ImportForm({
  deckId,
  existingCount,
  onDone,
}: {
  deckId: string;
  existingCount: number;
  onDone: () => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const deferredText = useDeferredValue(text);
  const parsed = useMemo(() => parseQuizImport(deferredText), [deferredText]);
  const bytes = useMemo(() => new TextEncoder().encode(text).length, [text]);
  const { questions, skipped } = parsed;

  const blocker =
    bytes > MAX_IMPORT_BYTES
      ? `Pasted text is ${Math.ceil(bytes / 1024)} KB; the maximum is ${MAX_IMPORT_BYTES / 1024} KB.`
      : questions.length > MAX_QUIZ_IMPORT
        ? `Maximum ${MAX_QUIZ_IMPORT} questions per import. Please split them into batches.`
        : null;

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await importQuizQuestions(deckId, questions, { replace });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        `Imported ${result.imported} ${result.imported === 1 ? "question" : "questions"}` +
          (replace && existingCount > 0 ? ` (replaced ${existingCount})` : ""),
      );
      onDone();
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-text`}>Questions</Label>
        <Textarea
          id={`${id}-text`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"「際に」の意味は？ | when | because | although | despite | 1 | Formal version of とき"}
          className="max-h-[40vh] min-h-40 overflow-y-auto font-mono text-xs md:text-xs"
          spellCheck={false}
          autoFocus
        />
      </div>

      {existingCount > 0 ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={replace}
            onChange={(event) => setReplace(event.target.checked)}
          />
          <span>
            Replace the {existingCount} existing {existingCount === 1 ? "question" : "questions"}
            <span className="block text-xs text-muted-foreground">
              Deletes the current set and saves this one in a single step; if the import fails,
              nothing is deleted.
            </span>
          </span>
        </label>
      ) : null}

      {text.trim() ? (
        <div className="grid gap-2">
          <p className="text-sm" aria-live="polite">
            <span className="font-medium">
              {questions.length} valid {questions.length === 1 ? "question" : "questions"} found
            </span>
            , {skipped.length} {skipped.length === 1 ? "error" : "errors"}
          </p>
          {questions.length > 0 ? (
            <ul className="grid gap-2 rounded-lg border p-3 text-sm">
              {questions.slice(0, PREVIEW_ROWS).map((question, index) => (
                <li key={index} className="grid gap-0.5">
                  <span className="font-medium whitespace-pre-wrap">{question.question}</span>
                  <span className="text-xs text-muted-foreground">
                    {question.options.map((option, i) => `${LETTERS[i]}. ${option}`).join("   ")}
                  </span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">
                    Answer: {LETTERS[question.correct_index]}
                    {question.explanation ? " · has explanation" : ""}
                  </span>
                </li>
              ))}
              {questions.length > PREVIEW_ROWS ? (
                <li className="text-xs text-muted-foreground">
                  …and {questions.length - PREVIEW_ROWS} more
                </li>
              ) : null}
            </ul>
          ) : null}
          {skipped.length > 0 ? (
            <details className="rounded-lg border px-3 py-2 text-sm">
              <summary className="cursor-pointer text-muted-foreground">View errors</summary>
              <ul className="mt-2 grid max-h-48 gap-1 overflow-y-auto">
                {skipped.slice(0, 100).map((row) => (
                  <li key={row.row} className="text-xs">
                    <span className="text-destructive">
                      Line {row.row}: {row.reason}
                    </span>
                    <span className="ml-2 font-mono text-muted-foreground">
                      {row.text.length > 80 ? `${row.text.slice(0, 80)}…` : row.text}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {blocker || error ? (
        <p role="alert" className="text-sm text-destructive">
          {blocker ?? error}
        </p>
      ) : null}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
        <Button onClick={submit} disabled={pending || !!blocker || questions.length === 0}>
          {pending
            ? "Importing…"
            : `${replace && existingCount > 0 ? "Replace with" : "Import"} ${questions.length} ${
                questions.length === 1 ? "question" : "questions"
              }`}
        </Button>
      </DialogFooter>
    </div>
  );
}
