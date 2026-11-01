import { Navbar } from "@/components/layout/navbar";

export default function Layout({ children }: LayoutProps<"/dashboard">) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
