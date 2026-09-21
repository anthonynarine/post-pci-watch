// # Filename: src/components/theme/ThemeToggle.tsx
"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const NEVER_CHANGES = () => () => {};

/**
 * The server cannot read localStorage or the OS colour-scheme query, so the first client
 * render must reproduce the server's markup exactly or hydration mismatches. React renders
 * the server snapshot (false) while hydrating, then re-renders with the client snapshot
 * (true), which is when the selected option may safely be highlighted.
 */
function useHasHydrated() {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}

/**
 * Client Component: it owns click handlers and reads the persisted theme, neither of which
 * a Server Component can do.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useHasHydrated();

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-raised p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = mounted && theme === value;

        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => setTheme(value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              selected
                ? "bg-primary text-primary-foreground"
                : "text-foreground-muted hover:bg-border/60 hover:text-foreground"
            }`}
          >
            <Icon aria-hidden="true" className="size-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
