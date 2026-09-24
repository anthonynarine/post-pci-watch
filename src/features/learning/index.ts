// # Filename: src/features/learning/index.ts

/**
 * One import surface for the teaching library. Routes import from here and never reach into
 * internal paths. Article section components under parts/request-pipeline/ are deliberately
 * not re-exported: they are only ever rendered by their article.
 */
export * from "./components/ArticleCard";
export * from "./components/ArticleShell";
export * from "./components/practice/HowPracticeWorks";
export * from "./components/practice/PracticeSession";

export * from "./data/articles";
export * from "./data/practiceDecks";
export * from "./parts";

export * from "./types/learning";
