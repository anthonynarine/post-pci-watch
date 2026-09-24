// # Filename: src/features/learning/parts/index.ts
import type { ComponentType } from "react";

import { RequestPipelineArticle } from "./request-pipeline/RequestPipelineArticle";

/**
 * Maps each article slug in data/articles.ts to the Server Component that renders its body.
 * Metadata and content are registered separately so the library index can list articles
 * without importing any article body. A slug listed in data/articles.ts but missing here is
 * a build-time error in the article route, not a silent blank page.
 */
export const ARTICLE_CONTENT: Record<string, ComponentType> = {
  "next-clerk-convex-request-pipeline": RequestPipelineArticle,
};
