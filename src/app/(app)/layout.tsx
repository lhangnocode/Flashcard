import { Navbar } from "@/components/layout/navbar";

// Standard pages (dashboard, decks, settings) share one navbar. It stays
// mounted while moving between them. The study session lives in the (focus)
// group, which has no navbar, so focus mode needs no CSS toggle.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
