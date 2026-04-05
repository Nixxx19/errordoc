import type { ErrorDocOptions, AnalysisResult, ErrorMatch } from "./types.js";
import { matchers, PATTERN_COUNT } from "./matchers/index.js";
import { detectFrameworks, stripAnsi } from "./utils/extract.js";

/**
 * Analyze an error string and return human-readable explanations with fixes.
 *
 * @param input - Raw error output (stderr, stack trace, terminal output)
 * @param options - Configuration options
 * @returns Analysis result with matched errors, detected frameworks, and timing
 *
 * @example
 * ```ts
 * import { analyze } from 'errordoc';
 *
 * const result = analyze(`TypeError: Cannot read properties of undefined (reading 'map')`);
 * console.log(result.matches[0].explanation);
 * // → You're trying to access "map" on undefined. The object doesn't exist...
 * console.log(result.matches[0].fixes[0].description);
 * // → Add a null check: obj?.map (optional chaining)
 * ```
 */
export function analyze(
  input: string,
  options: ErrorDocOptions = {}
): AnalysisResult {
  const start = performance.now();
  const cleaned = stripAnsi(input);
  const detectedFrameworks = detectFrameworks(cleaned);
  const activeFrameworks = options.frameworks ?? detectedFrameworks;
  const maxResults = options.maxResults ?? 5;
  const minConfidence = options.minConfidence ?? 0.3;
  const ignoreSet = new Set(options.ignore ?? []);

  const matches: ErrorMatch[] = [];

  for (const matcher of matchers) {
    if (ignoreSet.has(matcher.id)) continue;
    try {
      if (matcher.test(cleaned)) {
        const match = matcher.match(cleaned);
        if (match && match.confidence >= minConfidence) {
          matches.push(match);
        }
      }
    } catch {
      // Skip matchers that throw (e.g., regex match failures)
      continue;
    }

    if (matches.length >= maxResults) break;
  }

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);

  return {
    matches: matches.slice(0, maxResults),
    patternsChecked: PATTERN_COUNT,
    duration: Math.round((performance.now() - start) * 100) / 100,
    detectedFrameworks,
  };
}

/**
 * Quick check — returns the top match or null.
 *
 * @example
 * ```ts
 * import { explain } from 'errordoc';
 *
 * const match = explain(`ECONNREFUSED 127.0.0.1:5432`);
 * console.log(match?.explanation);
 * // → Connection refused to 127.0.0.1:5432. PostgreSQL is not running...
 * ```
 */
export function explain(input: string): ErrorMatch | null {
  const result = analyze(input, { maxResults: 1 });
  return result.matches[0] ?? null;
}
