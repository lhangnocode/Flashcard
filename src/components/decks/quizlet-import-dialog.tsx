"use client";

import { FileTextIcon, UploadIcon } from "lucide-react";
import { useDeferredValue, useId, useMemo, useRef, useState, useTransition } from "react";
import { importCards } from "@/app/(app)/decks/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseImport, unescapeSeparator } from "@/lib/quizlet-parse";
import { MAX_IMPORT_BYTES, MAX_IMPORT_CARDS, type ImportResult } from "@/lib/validation";

const TERM_SEPARATORS = { tab: "\t", comma: "," } as const;
const CARD_SEPARATORS = { newline: "\n", blank: "\n\n" } as const;
const PREVIEW_ROWS = 5;

type TermOption = keyof typeof TERM_SEPARATORS | "custom";
type CardOption = keyof typeof CARD_SEPARATORS | "custom";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function QuizletImportDialog({ deckId }: { deckId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <UploadIcon /> Import
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import cards</DialogTitle>
          <DialogDescription>
            Paste a Quizlet export (set → ⋯ → Export), or open an Anki text export (File →
            Export → “Cards in Plain Text (.txt)” or “Notes in Plain Text”, with or without HTML).
          </DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a closed dialog starts fresh next time. */}
        {open ? <ImportForm deckId={deckId} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ImportForm({ deckId, onDone }: { deckId: string; onDone: () => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [termOption, setTermOption] = useState<TermOption>("tab");
  const [customTerm, setCustomTerm] = useState("");
  const [cardOption, setCardOption] = useState<CardOption>("newline");
  const [customCard, setCustomCard] = useState("");
  const [skipExisting, setSkipExisting] = useState(true);
  const [result, setResult] = useState<ImportResult>();
  const [fileError, setFileError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const termSeparator =
    termOption === "custom" ? unescapeSeparator(customTerm) : TERM_SEPARATORS[termOption];
  const cardSeparator =
    cardOption === "custom" ? unescapeSeparator(customCard) : CARD_SEPARATORS[cardOption];

  // Parse a slightly stale copy of the text so typing in a big paste stays smooth.
  const deferredText = useDeferredValue(text);
  const parsed = useMemo(
    () => parseImport(deferredText, { termSeparator, cardSeparator, dedupe: skipExisting }),
    [deferredText, termSeparator, cardSeparator, skipExisting],
  );
  const bytes = useMemo(() => new TextEncoder().encode(text).length, [text]);
  // An Anki file names its own separator and quoting, so the controls don't apply.
  const anki = parsed.anki;

  // The first problem that blocks importing, if any.
  const blocker = !anki && !termSeparator
    ? "Enter a custom separator between term and definition."
    : !anki && !cardSeparator
      ? "Enter a custom separator between cards."
      : bytes > MAX_IMPORT_BYTES
        ? `Pasted text is ${Math.ceil(bytes / 1024)} KB; the maximum is ${MAX_IMPORT_BYTES / 1024} KB.`
        : parsed.cards.length > MAX_IMPORT_CARDS
          ? `Maximum ${MAX_IMPORT_CARDS} cards per import. Please split large decks into multiple batches.`
          : null;

  async function openFile(file: File | undefined) {
    setFileError(undefined);
    if (!file) return;
    // Checked before reading, so a huge file is never loaded into the page.
    if (file.size > MAX_IMPORT_BYTES) {
      setFileError(
        `${file.name} is ${Math.ceil(file.size / 1024)} KB; the maximum is ${MAX_IMPORT_BYTES / 1024} KB.`,
      );
      return;
    }
    try {
      setText(await file.text());
    } catch {
      setFileError(`Couldn’t read ${file.name}.`);
    }
  }

  function submit() {
    setResult(undefined);
    startTransition(async () => {
      const outcome = await importCards(deckId, parsed.cards, { skipExisting });
      setResult(outcome);
      if (outcome.ok) setText("");
    });
  }

  if (result?.ok) {
    return (
      <div className="grid gap-4">
        <p role="status">
          Imported {result.imported} {result.imported === 1 ? "card" : "cards"}.
          {result.skippedDuplicates > 0
            ? ` Skipped ${result.skippedDuplicates} already in this deck.`
            : ""}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setResult(undefined)}>
            Import more
          </Button>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </div>
    );
  }

  const textId = `${id}-text`;
  const termId = `${id}-term`;
  const cardId = `${id}-card`;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <div className="flex items-end justify-between gap-2">
          <Label htmlFor={textId}>Exported text</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInput.current?.click()}
          >
            <FileTextIcon /> Open .txt file
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.tsv,.csv,text/plain"
            className="hidden"
            onChange={(event) => {
              void openFile(event.target.files?.[0]);
              event.target.value = ""; // lets the same file be picked again
            }}
          />
        </div>
        <Textarea
          id={textId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"たびに\tevery time, whenever\n間に\twhile, during"}
          className="max-h-[40vh] min-h-48 overflow-y-auto font-mono text-xs md:text-xs"
          spellCheck={false}
          autoFocus
        />
        {fileError ? (
          <p role="alert" className="text-sm text-destructive">
            {fileError}
          </p>
        ) : null}
      </div>

      {anki ? (
        <p role="status" className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          Anki export detected ({anki.separatorName}-separated, {anki.html ? "HTML" : "plain text"}
          ). The file’s own settings are used
          {anki.html ? "; formatting, images and audio tags are removed" : "; audio tags are removed"}.
        </p>
      ) : null}

      <fieldset disabled={!!anki} className="grid gap-3 disabled:opacity-50 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={termId}>Between term and definition</Label>
          <select
            id={termId}
            className={selectClass}
            value={termOption}
            onChange={(event) => setTermOption(event.target.value as TermOption)}
          >
            <option value="tab">Tab</option>
            <option value="comma">Comma</option>
            <option value="custom">Custom</option>
          </select>
          {termOption === "custom" ? (
            <Input
              aria-label="Custom separator between term and definition"
              placeholder="e.g. ::"
              value={customTerm}
              onChange={(event) => setCustomTerm(event.target.value)}
            />
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={cardId}>Between cards</Label>
          <select
            id={cardId}
            className={selectClass}
            value={cardOption}
            onChange={(event) => setCardOption(event.target.value as CardOption)}
          >
            <option value="newline">New line</option>
            <option value="blank">Blank line (for multiline definitions)</option>
            <option value="custom">Custom</option>
          </select>
          {cardOption === "custom" ? (
            <Input
              aria-label="Custom separator between cards"
              placeholder="e.g. --- or \n\n"
              value={customCard}
              onChange={(event) => setCustomCard(event.target.value)}
            />
          ) : null}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Tip: if your Quizlet definitions span several lines, set “Between rows” to Custom in
        Quizlet’s export (for example <code>---</code>), then choose Custom here with the same
        marker. In custom fields, <code>\n</code> means a new line and <code>\t</code> a tab.
        Anki exports keep multiline fields on their own, so these settings aren’t needed for them.
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={skipExisting}
          onChange={(event) => setSkipExisting(event.target.checked)}
        />
        Skip cards whose front is already in this deck
      </label>

      {text.trim() ? <Preview parsed={parsed} dedupe={skipExisting} /> : null}

      {blocker ? (
        <p role="alert" className="text-sm text-destructive">
          {blocker}
        </p>
      ) : null}
      {result && !result.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      ) : null}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
        <Button onClick={submit} disabled={pending || !!blocker || parsed.cards.length === 0}>
          {pending
            ? "Importing…"
            : `Import ${parsed.cards.length} ${parsed.cards.length === 1 ? "card" : "cards"}`}
        </Button>
      </DialogFooter>
    </div>
  );
}

function Preview({
  parsed,
  dedupe,
}: {
  parsed: ReturnType<typeof parseImport>;
  dedupe: boolean;
}) {
  const { cards, skipped, duplicatesInPaste } = parsed;
  return (
    <div className="grid gap-2">
      <p className="text-sm" aria-live="polite">
        <span className="font-medium">
          {cards.length} valid {cards.length === 1 ? "card" : "cards"} ready to import
        </span>
        {skipped.length > 0 ? ` · ${skipped.length} skipped` : ""}
        {dedupe && duplicatesInPaste > 0 ? ` · ${duplicatesInPaste} repeated in paste` : ""}
      </p>

      {cards.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 font-medium">Front</th>
                <th className="px-3 py-1.5 font-medium">Back</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cards.slice(0, PREVIEW_ROWS).map((card, index) => (
                <tr key={index} className="align-top">
                  <td className="px-3 py-1.5 font-medium whitespace-pre-wrap">{card.front}</td>
                  <td className="px-3 py-1.5">
                    <div className="line-clamp-4 whitespace-pre-wrap">{card.back}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cards.length > PREVIEW_ROWS ? (
            <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              …and {cards.length - PREVIEW_ROWS} more
            </p>
          ) : null}
        </div>
      ) : null}

      {skipped.length > 0 ? (
        <details className="rounded-lg border px-3 py-2 text-sm">
          <summary className="cursor-pointer text-muted-foreground">View skipped rows</summary>
          <ul className="mt-2 grid max-h-48 gap-1 overflow-y-auto">
            {skipped.slice(0, 100).map((row) => (
              <li key={row.row} className="text-xs">
                <span className="text-destructive">Row {row.row}: {row.reason}</span>
                <span className="ml-2 font-mono text-muted-foreground">
                  {row.text.length > 80 ? `${row.text.slice(0, 80)}…` : row.text}
                </span>
              </li>
            ))}
            {skipped.length > 100 ? (
              <li className="text-xs text-muted-foreground">…and {skipped.length - 100} more</li>
            ) : null}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
