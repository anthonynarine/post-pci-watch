// # Filename: src/features/learning/parts/request-pipeline/PostPciWatchMapSection.tsx
import { ArticleSection, C } from "../../components/ArticleSection";
import { FlowChain } from "../../components/FlowChain";
import { PipelineExplorer } from "../../components/PipelineExplorer";
import { REQUEST_PIPELINE_SCENARIOS } from "../../data/requestPipelineScenarios";

/**
 * Section 13 of Article 01. The lesson traced through code that exists in this repository:
 * the read path and the Phase 5 write path as chains, then the step-through explorer with
 * real excerpts for three scenarios. Every name used here was checked against the source.
 * The explorer is a separate interactive island; this section is a Server Component.
 */
export function PostPciWatchMapSection() {
  return (
    <ArticleSection id="post-pci-watch" number={13} title="Mapped onto Post-PCI Watch">
      <p>
        Everything above, in the code this project actually runs. First the read path that fills
        the measurement table:
      </p>

      <FlowChain
        label="Read path"
        steps={[
          "MonitoringDataWorkspace",
          "useQuery",
          "patients.getMyDemoPatient",
          "requireSubject",
          "patients.by_ownerSubject_and_demoKey",
          "useQuery",
          "measurements.listRecentForPatient",
          "requireOwnedPatient",
          "measurements.by_patientId_and_observedAt",
          "reactive measurement rows",
        ]}
      />

      <p>
        Two queries, chained. <C>getMyDemoPatient</C> takes no arguments and scopes its index
        to the caller&rsquo;s subject, so it can only ever find the caller&rsquo;s own patient.{" "}
        <C>listRecentForPatient</C> does take a <C>patientId</C>, so it proves ownership with{" "}
        <C>requireOwnedPatient</C> before reading a single measurement. The second query is
        skipped until the first returns a patient.
      </p>

      <FlowChain
        tone="return"
        label="Phase 5 write path"
        steps={[
          "RecordSyntheticHeartRate",
          "useMutation",
          "measurements.recordSyntheticHeartRate",
          "requireOwnedPatient",
          "bounds check, 30–200 bpm",
          "ctx.db.insert(\"measurements\", …)",
          "listRecentForPatient reruns",
          "RecentMeasurements rerenders",
        ]}
      />

      <p>
        Step through three runs below. Each step is placed in the system that executes it,
        says what crosses a boundary, and quotes the file that does it.
      </p>

      <PipelineExplorer scenarios={REQUEST_PIPELINE_SCENARIOS} />
    </ArticleSection>
  );
}
