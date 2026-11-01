"use client";

import { useActionState } from "react";
import { createCard, updateCard } from "@/app/decks/actions";
import { FormError, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult, ActionState } from "@/lib/validation";

export type CardData = {
  id: string;
  front: string;
  back: string;
  reading: string | null;
  example: string | null;
  notes: string | null;
};

// Controlled dialog: the parent decides when it's open, so it can be opened
// from a button ("Add card") or from a card's menu ("Edit").
export function CardFormDialog({
  deckId,
  card,
  open,
  onOpenChange,
}: {
  deckId: string;
  card?: CardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{card ? "Edit card" : "Add card"}</DialogTitle>
        </DialogHeader>
        <CardForm deckId={deckId} card={card} onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CardForm({
  deckId,
  card,
  onSuccess,
}: {
  deckId: string;
  card?: CardData;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData): Promise<ActionResult> => {
      const result = card
        ? await updateCard(card.id, prev, formData)
        : await createCard(deckId, prev, formData);
      if (result.ok) onSuccess();
      return result;
    },
    null,
  );
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-4">
      <FormField name="front" label="Front (term / grammar point)" required autoFocus
        defaultValue={card?.front} errors={errors?.front} />
      <FormField name="reading" label="Reading (furigana / kana)"
        defaultValue={card?.reading} errors={errors?.reading} />
      <FormField name="back" label="Back (definition / explanation)" required multiline
        defaultValue={card?.back} errors={errors?.back} />
      <FormField name="example" label="Example sentences (one per line)" multiline
        defaultValue={card?.example} errors={errors?.example} />
      <FormField name="notes" label="Usage notes" multiline
        defaultValue={card?.notes} errors={errors?.notes} />
      <FormError message={state && !state.ok ? state.error : undefined} />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : card ? "Save" : "Add card"}
        </Button>
      </DialogFooter>
    </form>
  );
}
