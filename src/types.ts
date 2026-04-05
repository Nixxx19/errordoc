export interface ErrorMatch {
  /** Unique identifier for this error pattern */
  id: string;
  /** The matched error pattern name */
  pattern: string;
  /** Human-readable explanation of what went wrong */
  explanation: string;
  /** Suggested fixes, ordered by likelihood */
  fixes: Fix[];
  /** Confidence score 0-1 */
  confidence: number;
  /** Category of the error */
  category: ErrorCategory;
  /** Framework/runtime context if detected */
  framework?: string;
  /** Original error text that was matched */
  matched: string;
  /** URL to relevant documentation */
  docsUrl?: string;
}

export interface Fix {
  /** Human-readable description of the fix */
  description: string;
  /** Shell command to run (if applicable) */
  command?: string;
  /** Whether this fix is safe to auto-run */
  safe: boolean;
}

export type ErrorCategory =
  | "module"
  | "syntax"
  | "type"
  | "runtime"
  | "network"
  | "permission"
  | "memory"
  | "build"
  | "config"
  | "database"
  | "auth"
  | "async"
  | "dependency"
  | "environment";

export interface Matcher {
  /** Unique ID for this matcher */
  id: string;
  /** Display name */
  name: string;
  /** Frameworks/runtimes this matcher applies to */
  frameworks: string[];
  /** Test if this matcher can handle the error */
  test(input: string): boolean;
  /** Parse the error and return a match */
  match(input: string): ErrorMatch | null;
}

export interface ErrorDocOptions {
  /** Enable framework-specific matchers (auto-detected if not set) */
  frameworks?: string[];
  /** Include AI-powered analysis for unknown errors */
  ai?: boolean;
  /** Output format */
  format?: "text" | "json" | "markdown";
  /** Maximum number of results to return */
  maxResults?: number;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
}

export interface AnalysisResult {
  /** All matched errors */
  matches: ErrorMatch[];
  /** Total number of patterns checked */
  patternsChecked: number;
  /** Time taken in milliseconds */
  duration: number;
  /** Detected frameworks */
  detectedFrameworks: string[];
}
