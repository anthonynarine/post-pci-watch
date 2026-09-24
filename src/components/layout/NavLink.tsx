// # Filename: src/components/layout/NavLink.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A header link that knows whether it points at the current section. A Client Component
 * only because usePathname reads the browser's current URL during client navigation; the
 * header around it stays a Server Component. The current section is marked with
 * aria-current and with a visible style, so the state never depends on colour alone.
 */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        current
          ? "bg-surface-raised text-foreground underline decoration-primary decoration-2 underline-offset-[6px]"
          : "text-foreground-muted hover:bg-surface-raised hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
