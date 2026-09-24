// # Filename: src/components/convex/ConvexClientProvider.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithAuth, ConvexReactClient, useConvexAuth } from "convex/react";

// Read at module scope so a missing URL fails loudly at load instead of producing a client
// that silently never connects. NEXT_PUBLIC_ is what makes the value available in the
// browser at all — the deployment URL is public by design; no secret appears here.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` to create it.");
}

// One client per browser tab, and exactly one construction site in the whole application.
// It owns the WebSocket that every useQuery subscription shares. Recovery below re-runs
// setAuth() on THIS client; it never builds a second one.
const convex = new ConvexReactClient(convexUrl);

type ConvexConnectionRecovery = {
  /** Bumped once per recovery attempt. Read as a dependency, never rendered as a count. */
  attempt: number;
  /** Requests exactly one fresh token attempt. Safe to call when already healthy. */
  reconnect: () => void;
  /** Live `navigator.onLine`. Surfaced because a false value here is S-20's trigger. */
  browserReportsOffline: boolean;
  /**
   * True when the most recent token fetch produced no token. This is the only reliable
   * "authentication has definitively failed" signal available to the UI — see the note on
   * ConvexClientProvider for why Convex's own isLoading cannot be used for it. A boolean
   * outcome only: no token, claim, session, or error text is retained anywhere.
   */
  tokenFetchFailed: boolean;
  /** Called by the token fetcher with the outcome of each attempt. */
  reportTokenFetch: (succeeded: boolean) => void;
};

const ConvexConnectionRecoveryContext = createContext<ConvexConnectionRecovery>({
  attempt: 0,
  reconnect: () => {},
  browserReportsOffline: false,
  tokenFetchFailed: false,
  reportTokenFetch: () => {},
});

/** Read by the dashboard to render the disconnected state and its Reconnect control. */
export function useConvexConnectionRecovery(): ConvexConnectionRecovery {
  return useContext(ConvexConnectionRecoveryContext);
}

/**
 * A copy of what `ConvexProviderWithClerk` does internally, with one deliberate difference:
 * `attempt` is in the dependency array.
 *
 * Why the copy exists. `ConvexProviderWithClerk` memoises `fetchAccessToken` on
 * `[orgId, orgRole, sessionId]` and swallows any throw from `getToken` by returning null.
 * When Clerk refuses to mint a token — S-20: `clerk_offline`, thrown because
 * `navigator.onLine` is a false negative — Convex is handed null, marks itself
 * unauthenticated, and then nothing ever changes those three values, so
 * `ConvexAuthStateFirstEffect` never re-runs and `setAuth()` is never called again. The
 * failure is permanent until the page reloads.
 *
 * `ConvexProviderWithAuth` is the documented integration point for any auth provider, and
 * a new `fetchAccessToken` identity is the supported signal that re-runs `setAuth()`. So
 * incrementing `attempt` is one authentication re-attempt, through the provider's own
 * lifecycle. Nothing here caches, stores, or forwards a token: `getToken` is Clerk's, and
 * its result is returned straight to Convex.
 */
function useAuthFromClerkWithRecovery() {
  const { attempt, reportTokenFetch } = useContext(ConvexConnectionRecoveryContext);
  const { isLoaded, isSignedIn, getToken, orgId, orgRole, sessionClaims, sessionId } = useAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        // Both branches are Clerk's own: a session token already minted for Convex needs no
        // template, otherwise the `convex` JWT template is named explicitly.
        const token =
          sessionClaims?.aud === "convex"
            ? await getToken({ skipCache: forceRefreshToken })
            : await getToken({ template: "convex", skipCache: forceRefreshToken });

        // Only whether a token came back. The token itself is returned to Convex and held
        // nowhere else.
        reportTokenFetch(token !== null);
        return token;
      } catch {
        // Kept identical to the library: Convex expects null, not a throw. The differences
        // are that `attempt` gives this callback a way to be rebuilt afterwards, and that
        // the failure is now reported instead of disappearing.
        reportTokenFetch(false);
        return null;
      }
    },
    // getToken is intentionally excluded, matching the library: Clerk does not memoise it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId, orgRole, sessionId, attempt, reportTokenFetch],
  );

  return useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: isSignedIn ?? false,
      fetchAccessToken,
    }),
    [isLoaded, isSignedIn, fetchAccessToken],
  );
}

/**
 * Renders nothing. It lives inside the provider because the decision to re-attempt needs
 * Convex's own view of the connection, which only exists below `ConvexProviderWithAuth`.
 */
function ConvexOnlineRecovery() {
  const { browserReportsOffline, reconnect, tokenFetchFailed } = useConvexConnectionRecovery();
  const { isLoaded, isSignedIn } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Remembers the previous value so the effect fires on the offline → online edge rather
  // than on every render that happens to be online.
  const wasOffline = useRef(browserReportsOffline);

  useEffect(() => {
    const crossedBackOnline = wasOffline.current && !browserReportsOffline;
    wasOffline.current = browserReportsOffline;

    // Not a transition: nothing to recover from.
    if (!crossedBackOnline) return;

    // A signed-out or revoked session is not a network failure. Re-attempting here would
    // be trying to restore an account state the user or Clerk deliberately ended.
    if (!isLoaded || !isSignedIn) return;

    // Already healthy — leave a working connection alone.
    if (isAuthenticated) return;

    // Genuinely still resolving, with no failure observed yet. isLoading alone is not
    // enough: after a failed retry it is true while authentication has in fact failed.
    if (isLoading && !tokenFetchFailed) return;

    // Exactly one attempt. `reconnect` changes `attempt`, not `browserReportsOffline`, so
    // this effect cannot re-enter its own trigger: there is no retry loop.
    reconnect();
  }, [
    browserReportsOffline,
    isAuthenticated,
    isLoaded,
    isLoading,
    isSignedIn,
    reconnect,
    tokenFetchFailed,
  ]);

  return null;
}

/**
 * ConvexProviderWithAuth replaces the plain ConvexProvider of Phase 3, and as of the S-20
 * remediation it replaces ConvexProviderWithClerk too — see useAuthFromClerkWithRecovery
 * for why. The token flow is unchanged: Clerk mints a JWT from the `convex` template,
 * Convex verifies its signature against the issuer named in convex/auth.config.ts, and
 * only then does `ctx.auth.getUserIdentity()` return anything.
 *
 * This must render inside ClerkProvider: `useAuth` reads Clerk's context.
 */
export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const [attempt, setAttempt] = useState(0);

  // Starts false so the server-rendered markup and the first client render agree; the
  // effect below corrects it immediately after mount.
  const [browserReportsOffline, setBrowserReportsOffline] = useState(false);

  /**
   * Why this exists rather than reading Convex's own isLoading.
   *
   * When `fetchAccessToken` changes identity, Convex's cleanup runs
   * `setIsConvexAuthenticated(prev => prev ? false : null)`. A previously failed state is
   * already `false`, which is falsy, so it becomes `null` — and `null` means isLoading.
   * If the retried fetch also fails, nothing moves it off `null`, and the dashboard shows
   * "Authenticating with Convex…" forever. That is the precise misreport S-20 recorded, so
   * a retry must not be able to recreate it.
   *
   * Our wrapper is the one place that actually observes the outcome, so it records it.
   */
  const [tokenFetchFailed, setTokenFetchFailed] = useState(false);

  const reconnect = useCallback(() => setAttempt((previous) => previous + 1), []);

  // Stable identity: it sits in the token fetcher's dependency array, and a changing one
  // would rebuild the fetcher on every render and re-run setAuth in a loop.
  const reportTokenFetch = useCallback(
    (succeeded: boolean) => setTokenFetchFailed(!succeeded),
    [],
  );

  useEffect(() => {
    const read = () => setBrowserReportsOffline(!navigator.onLine);

    read();
    window.addEventListener("online", read);
    window.addEventListener("offline", read);

    return () => {
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
    };
  }, []);

  const recovery = useMemo(
    () => ({ attempt, reconnect, browserReportsOffline, tokenFetchFailed, reportTokenFetch }),
    [attempt, reconnect, browserReportsOffline, tokenFetchFailed, reportTokenFetch],
  );

  return (
    <ConvexConnectionRecoveryContext.Provider value={recovery}>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromClerkWithRecovery}>
        <ConvexOnlineRecovery />
        {children}
      </ConvexProviderWithAuth>
    </ConvexConnectionRecoveryContext.Provider>
  );
}
