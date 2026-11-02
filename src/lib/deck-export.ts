// Writes cards as an Anki-style plain-text export, which this app's importer
// (Anki mode) and Anki itself read back exactly:
//   #separator:tab / #html:false header, one card per record, and a field
//   wrapped in "…" (with "" for a quote) when it contains a tab, line break
//   or quote, or starts with "#" (so a row can't be mistaken for a header).
export function formatDeckExport(cards: { front: string; back: string }[]) {
  const rows = cards.map((card) => `${quoteField(card.front)}\t${quoteField(card.back)}`);
  // Line breaks are written as \n. Cards saved from a browser form may hold
  // \r\n (how textareas submit), which reads back as \n either way.
  return ["#separator:tab", "#html:false", ...rows].join("\n") + "\n";
}

function quoteField(raw: string) {
  const value = raw.replace(/\r\n?/g, "\n");
  return /[\t\n\r"]|^#/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// "<title>-cards.txt" with characters that file systems reject removed.
// Letters from any language (Vietnamese, Japanese) are kept.
export function exportFileName(title: string) {
  const safe = title
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "") // no leading/trailing dots (hidden or invalid names)
    .slice(0, 100)
    .trim();
  return `${safe || "deck"}-cards.txt`;
}
