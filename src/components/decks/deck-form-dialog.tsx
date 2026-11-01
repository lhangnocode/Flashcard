"use client";

import { useActionState, useState, type ReactElement } from "react";
import { createDeck, updateDeck } from "@/app/(app)/decks/actions";
import { FormError, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult, ActionState } from "@/lib/validation";

type Deck = { id: string; title: string; description: string | null };

// Create a deck (no `deck`) or edit one (with `deck`).
export function DeckFormDialog({
  deck,
  trigger,
}: {
  deck?: Deck;
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deck ? "Edit deck" : "New deck"}</DialogTitle>
        </DialogHeader>
        {/* The form unmounts when the dialog closes, so errors reset. */}
        <DeckForm deck={deck} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function DeckForm({ deck, onSuccess }: { deck?: Deck; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData): Promise<ActionResult> => {
      const result = deck
        ? await updateDeck(deck.id, prev, formData)
        : await createDeck(prev, formData);
      if (result.ok) onSuccess();
      return result;
    },
    null,
  );
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-4">
      <FormField
        name="title"
        label="Title"
        required
        autoFocus
        defaultValue={deck?.title}
        errors={fieldErrors?.title}
      />
      <FormField
        name="description"
        label="Description"
        multiline
        defaultValue={deck?.description}
        errors={fieldErrors?.description}
      />
      <FormError message={state && !state.ok ? state.error : undefined} />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : deck ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
