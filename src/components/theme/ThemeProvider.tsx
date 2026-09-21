// # Filename: src/components/theme/ThemeProvider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Client Component: next-themes reads the OS colour-scheme media query and localStorage,
 * both of which only exist in the browser. Keeping the configuration in this one file means
 * the root layout can stay a Server Component and only this subtree ships JavaScript.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      storageKey="post-pci-watch-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
