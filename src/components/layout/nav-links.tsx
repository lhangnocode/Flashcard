"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/decks", label: "Decks" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  return <NavLinkList isActive={(href) => pathname === href || pathname.startsWith(`${href}/`)} />;
}

// Also the Suspense fallback (no active state), so the links never flash in.
export function NavLinkList({ isActive = () => false }: { isActive?: (href: string) => boolean }) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map(({ href, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground",
              active ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
