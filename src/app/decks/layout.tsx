import { Navbar } from "@/components/layout/navbar";

export default function Layout({ children }: LayoutProps<"/decks">) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
