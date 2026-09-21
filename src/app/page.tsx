// # Filename: src/app/page.tsx
import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Activity, FlaskConical, LockKeyhole } from "lucide-react";

const POINTS = [
  {
    Icon: FlaskConical,
    title: "Synthetic data only",
    body: "Every patient, measurement, and event is fabricated for development. Nothing here comes from a real device or a real person.",
  },
  {
    Icon: Activity,
    title: "Measurements, then events",
    body: "Observations are recorded with their units, source, and both timestamps. Noteworthy events are derived from them by explicit rules.",
  },
  {
    Icon: LockKeyhole,
    title: "Access is checked on the server",
    body: "The monitoring dashboard is protected where it is rendered, not only by the URL you request.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 py-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Post-PCI Watch
        </h1>
        <p className="mt-3 text-base text-foreground-muted">
          A teaching project: a synthetic remote-monitoring dashboard for a fictional patient
          after percutaneous coronary intervention. It is not a medical device, it gives no
          medical advice, and it makes no diagnosis.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Rendered by Clerk on the client from the session state the provider published:
              signed-out visitors get the entry controls, signed-in ones get the way in. */}
          <Show when="signed-out">
            <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="redirect" forceRedirectUrl="/dashboard">
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Create an account
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Open the dashboard
            </Link>
          </Show>
        </div>
      </div>

      <dl className="grid gap-5 sm:grid-cols-3">
        {POINTS.map(({ Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-border bg-surface p-4">
            <dt className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Icon aria-hidden="true" className="size-4 text-foreground-muted" />
              {title}
            </dt>
            <dd className="mt-2 text-xs text-foreground-muted">{body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
