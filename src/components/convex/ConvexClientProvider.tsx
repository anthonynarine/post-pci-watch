// # Filename: src/components/convex/ConvexClientProvider.tsx
"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

// Read at module scope so a missing URL fails loudly at load instead of producing a client
// that silently never connects. NEXT_PUBLIC_ is what makes the value available in the
// browser at all — the deployment URL is public by design; no secret appears here.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` to create it.");
}

// One client per browser tab. It owns the WebSocket that every useQuery subscription in the
// app shares, which is why this is created once at module scope rather than per render.
const convex = new ConvexReactClient(convexUrl);

/**
 * ConvexProviderWithClerk replaces the plain ConvexProvider of Phase 3.
 *
 * The difference is the token. Given Clerk's `useAuth`, it calls `getToken({ template:
 * "convex" })`, hands the JWT to the Convex client, and refreshes it before expiry. Convex
 * then verifies that token's signature against the issuer named in convex/auth.config.ts,
 * which is what finally makes `ctx.auth.getUserIdentity()` return something.
 *
 * Plain ConvexProvider sends no token at all. Swapping it back would not produce an error
 * here — every protected query would simply start failing with "Not authenticated".
 *
 * This must render inside ClerkProvider: `useAuth` reads Clerk's context.
 */
export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
