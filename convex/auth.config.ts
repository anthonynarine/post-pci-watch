// # Filename: convex/auth.config.ts
/**
 * Tells this Convex deployment which JWT issuer to trust.
 *
 * Convex fetches {domain}/.well-known/openid-configuration to discover the issuer's public
 * keys, then verifies the signature of every token a client presents. Without this file
 * `ctx.auth.getUserIdentity()` returns null forever — not an error, just silence, which is
 * why a missing auth.config.ts looks like "my auth code does nothing".
 *
 * CLERK_FRONTEND_API_URL is an environment variable on the Convex deployment, not on the
 * Next.js server. Convex reads it when this file is evaluated at deploy time.
 */
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
