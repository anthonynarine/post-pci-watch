// # Filename: src/app/page.tsx
import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Activity, FlaskConical, LockKeyhole } from "lucide-react";

/**
 * The demo's story in the order data actually moves. Each step names the piece of the stack
 * that does it, so the page doubles as a map of the architecture.
 */
const FLOW = [
  {
    step: "A synthetic wearable produces readings",
    body: "A simulator on Convex's servers writes heart rate, SpO₂, and respiratory rate every 5 seconds, moving through resting, walking, sleeping, and recovery. It runs with no browser open and stops itself after 15 minutes.",
  },
  {
    step: "Convex stores each reading with its provenance",
    body: "Every row records what produced it, when it was observed, and when it was stored. Nothing a browser sends can change who wrote it or where it came from.",
  },
  {
    step: "The dashboard updates without refreshing",
    body: "The page holds live subscriptions. When a reading commits, Convex pushes the new result to every open dashboard — no polling, no reload.",
  },
  {
    step: "Clerk decides who you are; the server decides what you may see",
    body: "Clerk signs you in. Convex verifies that sign-in on every request and only ever returns records you own.",
  },
  {
    step: "Explicit rules flag noteworthy events",
    body: "Versioned software rules — for example, heart rate above a configured threshold for three readings — open and close events as readings arrive. Rules, not AI, and not diagnoses.",
  },
];

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
    body: "The dashboard is protected where it is rendered, and every record is checked for ownership on the backend — not only by the URL you request.",
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

      <section>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">How it works</h2>
        <ol className="mt-3 space-y-3">
          {FLOW.map(({ step, body }, index) => (
            <li key={step} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{step}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

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
