// # Filename: src/proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 calls this file `proxy.ts` (it was `middleware.ts` through 15). It runs before
// every matched request and resolves the Clerk session cookie into a request-scoped auth
// context. It does not gate anything here: /dashboard protects itself with auth.protect(),
// so the rule lives next to the resource it guards. Without this file, `auth()` in a Server
// Component would have no session to read.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
