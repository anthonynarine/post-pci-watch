// # Filename: src/features/learning/parts/request-pipeline/RequestPipelineArticle.tsx
import { AuthnAuthzSection } from "./AuthnAuthzSection";
import { ArchitecturalSentenceSection } from "./ArchitecturalSentenceSection";
import { MasteryCheckSection, MentalModelSection, SourcesSection } from "./ClosingSections";
import { CtxSection } from "./CtxSection";
import { FourSystemsSection } from "./FourSystemsSection";
import { GeneratedApiSection } from "./GeneratedApiSection";
import { InternalFunctionsSection } from "./InternalFunctionsSection";
import { MisconceptionsSection } from "./MisconceptionsSection";
import { PostPciWatchMapSection } from "./PostPciWatchMapSection";
import { PublicFunctionsSection } from "./PublicFunctionsSection";
import { RequestPipelineSection } from "./RequestPipelineSection";
import { SecurityBoundarySection } from "./SecurityBoundarySection";
import { ServerClientSection } from "./ServerClientSection";
import { WhyRerenderSection } from "./WhyRerenderSection";

/**
 * Article 01, "How Next.js, Clerk, and Convex Handle One Request". Composition only: the
 * order of sections here must match the `sections` list in data/articles.ts, which drives
 * the table of contents. A Server Component; the two explorers inside opt into the client
 * on their own.
 */
export function RequestPipelineArticle() {
  return (
    <>
      <ArchitecturalSentenceSection />
      <FourSystemsSection />
      <RequestPipelineSection />
      <GeneratedApiSection />
      <PublicFunctionsSection />
      <InternalFunctionsSection />
      <CtxSection />
      <AuthnAuthzSection />
      <WhyRerenderSection />
      <ServerClientSection />
      <SecurityBoundarySection />
      <MisconceptionsSection />
      <PostPciWatchMapSection />
      <MentalModelSection />
      <MasteryCheckSection />
      <SourcesSection />
    </>
  );
}
