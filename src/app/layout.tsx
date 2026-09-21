// # Filename: src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Post-PCI Watch",
  description: "Synthetic post-PCI remote monitoring",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes runs a blocking inline script that sets the theme class before paint, so
    // the server-rendered <html> never matches the client's. suppressHydrationWarning tells
    // React that this one element's attributes are expected to differ.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {/* ClerkProvider publishes the session that the proxy already resolved for this
            request, so every Clerk component below it — on either side of the client
            boundary — reads the same auth state. */}
        <ClerkProvider>
          <ThemeProvider>
            <AppHeader />
            <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">{children}</main>
            <footer className="border-t border-border px-6 py-4">
              <p className="mx-auto max-w-7xl text-xs text-foreground-muted">
                Synthetic data only. Not a medical device and not for clinical
                decision-making.
              </p>
            </footer>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
