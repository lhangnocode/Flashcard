import { Navbar } from "@/components/layout/navbar";

export default function Layout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
