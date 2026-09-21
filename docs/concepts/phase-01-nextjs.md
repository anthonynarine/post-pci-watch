# Next.js Major Concepts

## Post-PCI Watch — Phase 1 Reference

This document records the major Next.js concepts demonstrated during Phase 1 of Post-PCI Watch. The goal is not to memorize framework syntax. The goal is to understand where code runs, how a request becomes a page, and how responsibilities are separated.

---

## 1. The App Router

Post-PCI Watch uses the Next.js **App Router**, which is organized through the `src/app/` directory.

Folders inside `app/` define URL segments, while special filenames define how those routes behave.

```text
src/app/
├── layout.tsx
├── page.tsx
└── globals.css
```

At the root level:

- `layout.tsx` defines the shared application shell.
- `page.tsx` defines the page rendered at `/`.
- `globals.css` contains application-wide styles and theme variables.

If the project later contains this file:

```text
src/app/dashboard/page.tsx
```

it defines the `/dashboard` route.

---

## 2. Layouts and Pages

### `layout.tsx`

The root layout wraps every route in the application. It is the appropriate place for application-wide concerns such as:

- The `<html>` and `<body>` elements
- Global styles
- Fonts
- Theme providers
- Authentication providers
- Shared navigation or application chrome

The layout receives the active page through its `children` prop.

### `page.tsx`

A page represents the content for one route. In Post-PCI Watch, the page acts as an **orchestrator**:

- It obtains the data needed by the route.
- It selects the components that should appear.
- It passes data into those components.
- It arranges the page-level layout.

The page should not contain hundreds of lines of detailed card markup. Presentational work belongs in smaller feature components.

```text
page.tsx
├── SyntheticDataNotice
├── PatientSummary
├── VitalsGrid
├── RecentMeasurements
├── NoteworthyEvents
├── RecoveryTimeline
├── DeviceStatus
└── ClinicianReview
```

---

## 3. The Initial Render Flow

The Phase 1 request flow is:

```text
Browser requests /
→ Next.js matches src/app/page.tsx
→ root layout wraps the page
→ page composes the monitoring components
→ synthetic data flows into components through props
→ Server Components render
→ Next.js sends rendered HTML to the browser
→ interactive Client Components hydrate where required
```

The browser does not directly open `page.tsx`. It requests a URL. Next.js maps that URL to the appropriate layout and page, executes the required rendering work, and produces the response.

---

## 4. Server Components

Components inside the App Router are **Server Components by default**. They do not require a special directive.

Server Components are appropriate when a component needs to:

- Render static content
- Receive and display props
- Read server-accessible data
- Keep sensitive server work outside the browser
- Avoid shipping unnecessary component JavaScript to the client

All static monitoring components in Phase 1 are Server Components because they only receive synthetic records and render markup. They do not need browser state, event handlers, effects, or browser-only APIs.

The absence of `"use client"` is meaningful: the component remains on the server side of the React component boundary.

---

## 5. Client Components

A component becomes a Client Component by placing this directive at the top of its file:

```tsx
"use client";
```

Client Components are needed for browser-side behavior such as:

- `useState`
- `useEffect`
- Click and input event handlers
- Browser APIs such as `window` and `localStorage`
- Interactive third-party hooks
- Live client subscriptions

In Phase 1, the theme provider and theme toggle are Client Components because they read theme state and respond to user interaction.

The dashboard itself does not become a Client Component merely because it is built with React. Client Components should be introduced because browser behavior requires them.

### Keep the client boundary small

`"use client"` creates a client-side boundary. Components imported beneath that boundary become part of the client-side component graph. Therefore, it should be placed as low in the component tree as practical.

For example, an interactive theme button can be a Client Component without converting the entire layout or dashboard into one.

---

## 6. Rendering and Hydration

### Rendering

Rendering converts React components and their data into a representation the browser can display.

### Hydration

Hydration is the process through which React attaches client-side behavior to HTML that has already been rendered.

Static Server Components do not need their component logic hydrated in the browser. Interactive Client Components do.

For hydration to succeed cleanly, the browser's initial result must agree with what the server rendered. If the server and browser produce different initial text or markup, React may report a hydration mismatch.

That is why Phase 1 uses a fixed synthetic time rather than calling `Date.now()` independently during rendering.

```text
SNAPSHOT_AT = fixed synthetic timestamp
```

This provides:

- Repeatable builds
- Stable screenshots
- Predictable tests
- Matching server and browser output

---

## 7. Static Rendering

The Phase 1 dashboard is statically rendered. During the production build, Next.js can create its output ahead of incoming user requests because the page does not depend on a signed-in user, request-specific data, or a live database.

```text
npm run build
→ Next.js renders the dashboard
→ static output is prepared
→ browsers receive the prepared page
```

Static rendering is more specific than saying that a component ran on the server. A server-rendered page could also be generated dynamically for each request. The Phase 1 dashboard does not need that yet.

Clerk authentication and Convex data will later change which parts can remain fully static.

---

## 8. Data Flows Down Through Props

Phase 1 follows a simple one-way data flow:

```text
Static feature data
→ page.tsx
→ component props
→ rendered interface
```

Presentational components do not import their own data records. Instead, the page supplies the records through props.

This keeps responsibilities clear:

- The page decides what data is used.
- The component decides how that data is displayed.

A `VitalCard` should not care whether its value eventually comes from a hardcoded file, Convex, an external device, or a test fixture. It should receive a valid value through its contract and render it.

When Convex is introduced, a reactive query will usually require a small Client Component controller or workspace. The likely future flow is:

```text
Convex database
→ reactive Convex query
→ monitoring controller/workspace
→ presentational dashboard components
```

The presentational components should remain mostly unchanged, but it is not accurate to guarantee that only `page.tsx` will change.

---

## 9. Feature-Oriented Organization

The monitoring feature owns its domain types, synthetic data, and presentation parts:

```text
src/features/monitoring/
├── components/
├── data/
├── types/
└── index.ts
```

This keeps related code together instead of spreading monitoring concerns across generic project-wide folders.

### Barrel export

`src/features/monitoring/index.ts` is the feature's public entry point. Other areas of the application import from the feature rather than reaching into its internal folders unnecessarily.

The barrel should expose the feature's supported public surface without exporting every internal implementation detail.

---

## 10. Domain Meaning Versus UI Appearance

Post-PCI Watch separates monitoring-domain meaning from reusable UI styling.

```text
ObservationStatus → domain meaning
StatusTone        → visual treatment
```

The monitoring domain might say that a value is below a configured threshold. A badge component might render that condition using a particular tone, icon, and label.

The domain should not know which CSS class or color is used. The reusable UI badge should not contain cardiology rules.

This distinction allows the same domain state to be represented in:

- A dashboard badge
- A table row
- A notification
- A PDF
- An API response

without placing presentation concerns inside the clinical model.

---

## 11. Measurements Versus Events

A measurement is an observation:

```text
SpO₂: 91%
Observed at: 14:31:05
Source: wearable-01
```

An event is derived by applying an explicit rule:

```text
Measurement history
→ configured deterministic rule
→ monitoring event
```

These concepts must remain structurally separate.

An event should preserve the rule, evidence, and detection time that produced it. Later, an AI system may summarize measurements and deterministic events, but it must not replace them as the source of truth.

---

## 12. Observation Time Versus Ingestion Time

A time-series measurement can contain at least two important timestamps:

- `observedAt`: when the device says the measurement occurred
- `ingestedAt`: when the application received or stored it

For example:

```text
Observed by wearable: 14:31:05
Received by system:    14:31:12
```

The difference can reveal network delay, offline buffering, out-of-order delivery, or stale data. Recording only the ingestion time would lose information about when the clinical observation actually occurred.

---

## 13. Responsive CSS Is Not Visual Verification

A successful Tailwind build can prove that responsive rules were generated. It cannot prove that the interface looks correct at every viewport.

Responsive verification should eventually include visual inspection at representative sizes:

- Mobile
- Tablet
- Desktop

Automated build success, compiled media queries, and visual QA answer different questions. All three can be useful, but they are not interchangeable.

---

## 14. Phase 1 Mental Model

The major architectural lesson is:

```text
URL
→ route
→ layout
→ page orchestration
→ feature components
→ rendered HTML
→ selective client hydration
```

The key principles are:

1. App Router files connect URLs to layouts and pages.
2. Pages orchestrate; smaller parts present focused pieces of the interface.
3. Components are Server Components by default.
4. Browser interaction introduces a Client Component boundary.
5. Data flows downward through explicit props.
6. Domain meaning remains separate from visual styling.
7. Observed facts remain separate from derived events and future AI interpretation.
8. Static rendering is used while the route has no request-specific or live data.

---

## Phase 1 Mastery Answers

### What roles do `layout.tsx` and `page.tsx` play?

`layout.tsx` supplies the shared application shell. `page.tsx` defines and orchestrates the content for a particular route.

### Why are the dashboard components Server Components?

They render supplied data without browser state, effects, event handlers, or browser-only APIs.

### Why do the theme components need `"use client"`?

They read client-side theme state and respond to user interaction.

### What happens if a Server Component tries to use `useState`?

Next.js reports an error because React state requires client-side execution. The interactive component must be placed behind a `"use client"` boundary.

### Why are records passed through props?

Props separate data orchestration from presentation. The components can remain reusable when the data source later changes.

