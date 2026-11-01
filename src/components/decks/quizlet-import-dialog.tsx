"use client";

import { UploadIcon } from "lucide-react";
import { useDeferredValue, useId, useMemo, useState, useTransition } from "react";
import { importCards } from "@/app/decks/actions";
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
        <UploadIcon /> Import from Quizlet
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Quizlet</DialogTitle>
          <DialogDescription>
            In Quizlet, open the set → ⋯ → Export, copy the text, and paste it below.
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
  const [pending, startTransition] = useTransition();

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

  // The first problem that blocks importing, if any.
  const blocker = !termSeparator
    ? "Enter a custom separator between term and definition."
    : !cardSeparator
      ? "Enter a custom separator between cards."
      : bytes > MAX_IMPORT_BYTES
        ? `Pasted text is ${Math.ceil(bytes / 1024)} KB; the maximum is ${MAX_IMPORT_BYTES / 1024} KB.`
        : parsed.cards.length > MAX_IMPORT_CARDS
          ? `Maximum ${MAX_IMPORT_CARDS} cards per import. Please split large decks into multiple batches.`
          : null;

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
        <Label htmlFor={textId}>Exported text</Label>
        <Textarea
          id={textId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"たびに\tevery time, whenever\n間に\twhile, during"}
          className="max-h-[40vh] min-h-48 overflow-y-auto font-mono text-xs md:text-xs"
          spellCheck={false}
          autoFocus
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: if your definitions span several lines, set “Between rows” to Custom in Quizlet’s
        export (for example <code>---</code>), then choose Custom here with the same marker. In
        custom fields, <code>\n</code> means a new line and <code>\t</code> a tab.
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
                  <td className="px-3 py-1.5 font-medium">{card.front}</td>
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
