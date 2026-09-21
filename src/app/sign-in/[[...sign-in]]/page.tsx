// # Filename: src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

// The optional catch-all segment lets Clerk own every step of its own flow — factor one,
// factor two, verification, recovery — under this single route.
export default function SignInPage() {
  return (
    <div className="flex items-center justify-center py-10">
      <SignIn />
    </div>
  );
}
