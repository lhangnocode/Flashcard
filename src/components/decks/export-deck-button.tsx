"use client";

import { DownloadIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { exportDeck } from "@/app/(app)/decks/actions";
import { Button } from "@/components/ui/button";
import { exportFileName } from "@/lib/deck-export";

// Downloads the deck as a .txt file that the Import dialog (and Anki) read back.
export function ExportDeckButton({ deckId }: { deckId: string }) {
  const [pending, startTransition] = useTransition();

  function onExport() {
    startTransition(async () => {
      const result = await exportDeck(deckId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.count === 0) {
        toast.warning("This deck has no cards to export");
        return;
      }
      const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFileName(result.title);
      document.body.append(link);
      link.click();
      link.remove();
      // Revoked on the next tick: some browsers start the download only
      // after click() returns.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success(`Exported ${result.count} ${result.count === 1 ? "card" : "cards"}`);
    });
  }

  return (
    <Button variant="outline" onClick={onExport} disabled={pending}>
      <DownloadIcon /> {pending ? "Exporting…" : "Export"}
    </Button>
  );
}
