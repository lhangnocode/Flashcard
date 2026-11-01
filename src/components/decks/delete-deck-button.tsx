"use client";

import { useState, useTransition } from "react";
import { deleteDeck } from "@/app/(app)/decks/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteDeckButton({
  deckId,
  title,
  cardCount,
}: {
  deckId: string;
  title: string;
  cardCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function confirmDelete() {
    setError(undefined);
    startTransition(async () => {
      // On success the action redirects to /decks; it only returns on failure.
      const result = await deleteDeck(deckId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the deck and its {cardCount}{" "}
            {cardCount === 1 ? "card" : "cards"}. Your review history is kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={confirmDelete}
          >
            {pending ? "Deleting…" : "Delete deck"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
