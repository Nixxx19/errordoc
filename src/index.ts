export { analyze, explain } from "./engine.js";
export { formatText, formatJson, formatMarkdown } from "./formatter.js";
export { PATTERN_COUNT } from "./matchers/index.js";
export type {
  ErrorMatch,
  Fix,
  ErrorCategory,
  Matcher,
  ErrorDocOptions,
  AnalysisResult,
} from "./types.js";
