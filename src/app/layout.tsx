import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_JP } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

// Noto Sans JP covers Latin and Japanese, so kanji always render with
// Japanese glyph shapes instead of the browser's Chinese fallback font.
// Only the Latin subset is preloaded; Google serves the Japanese glyphs in
// small unicode-range slices that load when a page uses them.
const notoSansJp = Noto_Sans_JP({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Japanese vocabulary and grammar flashcards with spaced repetition.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${notoSansJp.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
