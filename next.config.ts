// # Filename: next.config.ts
import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Clerk serves its UI bundle and its API from one per-instance origin, the "frontend API".
 * That origin is encoded inside the publishable key, which is a public value that already
 * ships to every browser — deriving it here reads nothing secret and keeps the policy
 * correct when the key changes (development instance, production instance, new app).
 */
function clerkFrontendApiOrigin(): string | null {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) return null;

  // pk_test_<base64("host$")> / pk_live_<base64("host$")>
  const encoded = publishableKey.split("_").slice(2).join("_");

  try {
    const host = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : null;
  } catch {
    return null;
  }
}

/** Convex is reached over HTTPS and, for live subscriptions, over a WebSocket. */
function convexOrigins(): string[] {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!url) return [];

  const httpsOrigin = new URL(url).origin;
  return [httpsOrigin, httpsOrigin.replace(/^https:/, "wss:")];
}

const clerkOrigin = clerkFrontendApiOrigin();

if (!clerkOrigin) {
  // Failing loudly beats shipping a policy with a hole in it. A missing Clerk origin would
  // block every Clerk script, which is far easier to diagnose here than in a browser.
  console.warn(
    "[csp] Could not derive the Clerk frontend API origin from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. Clerk scripts will be blocked.",
  );
}

const clerk = clerkOrigin ? [clerkOrigin] : [];
const convex = convexOrigins();

/** Clerk proxies every avatar, including OAuth provider images, through this host. */
const CLERK_IMAGE_HOST = "https://img.clerk.com";

/** Google OAuth is an enabled sign-in method; its flow leaves and returns through here. */
const GOOGLE_ACCOUNTS = "https://accounts.google.com";

/**
 * Development-only allowances. Next.js's dev server compiles with React Refresh, which
 * evaluates code at runtime, and talks to the browser over a local WebSocket for hot
 * reloading. Neither exists in a production build, so neither is granted there.
 */
const devScript = isProduction ? [] : ["'unsafe-eval'"];
const devConnect = isProduction ? [] : ["ws://localhost:*", "http://localhost:*"];

const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,

  // Clickjacking protection lives here rather than in X-Frame-Options. frame-ancestors is
  // the modern directive, it takes precedence where both are supported, and duplicating the
  // rule in two headers invites them to disagree later. Nothing in this app is framed.
  `frame-ancestors 'none'`,

  // Where forms may submit and where OAuth may hand off. Clerk posts credentials to its own
  // frontend API; the Google flow leaves for accounts.google.com and comes back.
  `form-action 'self' ${[...clerk, GOOGLE_ACCOUNTS].join(" ")}`,

  /**
   * 'unsafe-inline' is present deliberately, not by accident, and it is the weakest part of
   * this policy.
   *
   * Two inline scripts are structural here:
   *   1. Next.js App Router inlines its bootstrap and streaming payload as inline <script>.
   *   2. next-themes injects a blocking inline script to set the theme class before paint —
   *      removing it reintroduces the light/dark flash this project fixed in Phase 1.
   *
   * The correct fix is a per-request nonce, which requires generating it in proxy.ts and
   * setting the CSP header there, because a static header cannot carry a per-request value.
   * That is a larger change than this remediation, and it is recorded as a remaining
   * limitation under S-01 in docs/security/SECURITY_POSTURE.md rather than pretended away.
   *
   * What this directive still buys: no script may load from any origin except this one and
   * Clerk's. That is the control that bounds a compromised or malicious third-party script.
   */
  `script-src 'self' 'unsafe-inline' ${[...clerk, ...devScript].join(" ")}`,

  // Tailwind emits a stylesheet, but Clerk's components and next/font both apply inline
  // style attributes. No external stylesheet origin is permitted.
  `style-src 'self' 'unsafe-inline'`,

  `img-src 'self' data: blob: ${[CLERK_IMAGE_HOST, ...clerk].join(" ")}`,

  // next/font self-hosts Geist, so no external font origin is needed.
  `font-src 'self' data:`,

  // Clerk's API calls plus Convex over HTTPS and WebSocket. The wss: entry is what keeps
  // live queries working; without it every subscription fails silently.
  `connect-src 'self' ${[...clerk, ...convex, ...devConnect].join(" ")}`,

  // Clerk renders parts of some flows in an iframe, and Google's OAuth consent can frame.
  `frame-src 'self' ${[...clerk, GOOGLE_ACCOUNTS].join(" ")}`,

  `worker-src 'self' blob:`,
]
  .map((directive) => directive.replace(/\s+/g, " ").trim())
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // HSTS is production-only on purpose. Sent over http://localhost it would either be
  // ignored or, on a real hostname, pin the developer's browser to HTTPS for a local server
  // that does not speak it.
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Removes `X-Powered-By: Next.js`, which told an attacker the framework for free.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
