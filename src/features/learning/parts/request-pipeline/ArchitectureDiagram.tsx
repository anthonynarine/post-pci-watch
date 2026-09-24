// # Filename: src/features/learning/parts/request-pipeline/ArchitectureDiagram.tsx
import { Globe, KeyRound, Monitor, RefreshCcw, Server, ShieldCheck } from "lucide-react";

/**
 * The article's one architecture picture, built from plain HTML and CSS rather than a
 * diagram library. Every box carries a number, and the ordered list beneath the figure
 * explains each number in words — so nothing depends on colour, layout, or seeing the
 * picture at all. A Server Component.
 */

function Marker({ n }: { n: number }) {
  return (
    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface font-mono text-[10px] font-semibold text-foreground">
      {n}
    </span>
  );
}

function Box({
  n,
  title,
  detail,
  className = "border-border bg-surface",
}: {
  n: number;
  title: string;
  detail: string;
  className?: string;
}) {
  return (
    <div className={`flex gap-2.5 rounded-lg border px-3 py-2.5 ${className}`}>
      <Marker n={n} />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 font-mono text-[11px] leading-snug text-foreground-muted">{detail}</p>
      </div>
    </div>
  );
}

function Zone({
  label,
  Icon,
  className,
  children,
}: {
  label: string;
  Icon: typeof Monitor;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-3 ${className}`}>
      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
        <Icon aria-hidden="true" className="size-3.5" />
        {label}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

const EXPLANATION = [
  "A Client Component calls useQuery, useMutation, or useAction with a generated public reference from api.*.",
  "The one ConvexReactClient in the tab turns that into a message on its WebSocket. The connection, not the call, carries identity.",
  "Clerk turns the signed-in session into a short-lived signed JWT. The client sends it on the connection when it connects and when it refreshes.",
  "Convex verifies the JWT's signature and audience against the issuer named in convex/auth.config.ts.",
  "The named public function runs. Convex passes it a ctx built for its type — QueryCtx, MutationCtx, or ActionCtx — and the validated args.",
  "ctx.auth.getUserIdentity() returns the verified identity, or null. This is the end of authentication.",
  "Our code decides whether this caller may do this to this record. This is authorization, and nothing does it for us.",
  "Only then does the function read (query), write in one transaction (mutation), or call the outside world (action).",
  "The return path. A mutation answers its caller once. Separately, any write that overlaps a subscribed query's reads reruns that query and pushes the new result to every subscriber, and useQuery hands React a new value.",
];

export function ArchitectureDiagram() {
  return (
    <figure className="space-y-4">
      <div className="grid items-start gap-3 lg:grid-cols-[1fr_0.8fr_1.4fr]" aria-hidden="true">
        <Zone label="Browser · React" Icon={Monitor} className="border-accent-blue/40 bg-accent-blue/5">
          <Box n={1} title="Client Component" detail="useQuery(api.patients.getMyDemoPatient, {})" />
          <Box n={2} title="ConvexReactClient" detail="one WebSocket per tab" />
        </Zone>

        <Zone label="Clerk" Icon={KeyRound} className="border-accent-amber/40 bg-accent-amber/5">
          <Box n={3} title="Session → signed JWT" detail='getToken({ template: "convex" })' />
          <p className="px-1 text-[11px] leading-snug text-foreground-muted">
            Proves who the user is. Knows nothing about patients.
          </p>
        </Zone>

        <Zone label="Convex deployment" Icon={Server} className="border-accent-teal/40 bg-accent-teal/5">
          <Box n={4} title="Verify the token" detail="auth.config.ts → issuer public keys" />
          <div className="rounded-lg border border-dashed border-border-strong p-2">
            <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-foreground">
              <Globe className="size-3" />
              Public function handler(ctx, args)
            </p>
            <div className="space-y-2">
              <Box n={5} title="Typed ctx for this function type" detail="QueryCtx · MutationCtx · ActionCtx" />
              <Box n={6} title="ctx.auth — who is calling" detail="getUserIdentity() → subject" />
              <Box
                n={7}
                title="Our authorization — may they?"
                detail="requireOwnedPatient(ctx, patientId)"
                className="border-primary/40 bg-primary-soft"
              />
              <Box n={8} title="Database, or external service" detail="ctx.db (query, mutation) · fetch (action)" />
            </div>
          </div>
        </Zone>
      </div>

      <div
        aria-hidden="true"
        className="flex flex-wrap items-center gap-2 rounded-xl border border-accent-teal/40 bg-accent-teal/10 px-3 py-2.5"
      >
        <Marker n={9} />
        <RefreshCcw className="size-3.5 text-accent-teal" />
        <p className="text-xs font-semibold text-foreground">Reactive return path</p>
        <p className="font-mono text-[11px] text-foreground-muted">
          write commits → overlapping query reruns → result over the WebSocket → useQuery → React rerenders
        </p>
      </div>

      <figcaption>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <ShieldCheck aria-hidden="true" className="size-3.5 text-primary-text" />
          Reading the diagram, step by step
        </p>
        <ol className="mt-2 space-y-1.5">
          {EXPLANATION.map((text, index) => (
            <li key={text} className="flex gap-2.5 text-sm leading-6 text-foreground">
              <Marker n={index + 1} />
              <span className="min-w-0">{text}</span>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
