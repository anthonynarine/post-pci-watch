// # Filename: src/components/layout/AppHeader.tsx
import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Activity, FlaskConical, GraduationCap } from "lucide-react";

import { NavLink } from "@/components/layout/NavLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * The application header, a Server Component. Clerk's <Show> resolves the signed-in state on
 * the server; the two links that need the current URL for their active state are the small
 * NavLink Client Components.
 */

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Activity aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Post-PCI Watch
            </p>
            <p className="text-xs text-foreground-muted">
              Synthetic post-PCI remote monitoring
            </p>
          </div>
        </Link>

        {/* Wraps onto a second line on narrow screens rather than widening the page. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
            <FlaskConical aria-hidden="true" className="size-3.5" />
            Synthetic data
          </span>

          <ThemeToggle />

          {/* Public for everyone: the teaching library holds no patient data. */}
          <NavLink href="/learn">
            <GraduationCap aria-hidden="true" className="size-3.5" />
            Learn
          </NavLink>

          <Show when="signed-out">
            <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="redirect" forceRedirectUrl="/dashboard">
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Create account
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
