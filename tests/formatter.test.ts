import { describe, it, expect } from "vitest";
import { formatJson, formatMarkdown, formatText } from "../src/formatter";
import { analyze } from "../src/engine";
import type { AnalysisResult } from "../src/types";

function makeEmptyResult(): AnalysisResult {
  return {
    matches: [],
    patternsChecked: 42,
    duration: 1.23,
    detectedFrameworks: [],
  };
}

function getResultWithMatches(): AnalysisResult {
  return analyze(
    "TypeError: Cannot read properties of undefined (reading 'map')"
  );
}

// ────────────────────────────────────────────────────────────────────────────
// formatJson
// ────────────────────────────────────────────────────────────────────────────

describe("formatJson", () => {
  it("returns valid JSON", () => {
    const result = getResultWithMatches();
    const json = formatJson(result);
    const parsed = JSON.parse(json);
    expect(parsed).toBeDefined();
    expect(parsed.matches).toBeInstanceOf(Array);
    expect(parsed.patternsChecked).toBeGreaterThan(0);
  });

  it("returns valid JSON for empty matches", () => {
    const result = makeEmptyResult();
    const json = formatJson(result);
    const parsed = JSON.parse(json);
    expect(parsed.matches).toHaveLength(0);
    expect(parsed.patternsChecked).toBe(42);
  });

  it("preserves all fields in JSON output", () => {
    const result = getResultWithMatches();
    const json = formatJson(result);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty("matches");
    expect(parsed).toHaveProperty("patternsChecked");
    expect(parsed).toHaveProperty("duration");
    expect(parsed).toHaveProperty("detectedFrameworks");
    if (parsed.matches.length > 0) {
      const match = parsed.matches[0];
      expect(match).toHaveProperty("id");
      expect(match).toHaveProperty("pattern");
      expect(match).toHaveProperty("explanation");
      expect(match).toHaveProperty("fixes");
      expect(match).toHaveProperty("confidence");
      expect(match).toHaveProperty("category");
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// formatMarkdown
// ────────────────────────────────────────────────────────────────────────────

describe("formatMarkdown", () => {
  it("returns valid markdown with headers for matches", () => {
    const result = getResultWithMatches();
    const md = formatMarkdown(result);
    expect(md).toContain("# errordoc analysis");
    expect(md).toContain("## ");
    expect(md).toContain("confidence");
  });

  it("includes fix sections with code blocks", () => {
    const result = getResultWithMatches();
    const md = formatMarkdown(result);
    if (result.matches[0]?.fixes.some((f) => f.command)) {
      expect(md).toContain("### Fixes");
      expect(md).toContain("```");
    }
  });

  it("returns a no-match message for empty results", () => {
    const result = makeEmptyResult();
    const md = formatMarkdown(result);
    expect(md).toContain("No matching error patterns found");
    expect(md).not.toContain("# errordoc");
  });

  it("includes detected frameworks when present", () => {
    const result = analyze(
      "Invalid hook call. Hooks can only be called inside of the body of a function component."
    );
    const md = formatMarkdown(result);
    if (result.detectedFrameworks.length > 0) {
      expect(md).toContain("Detected frameworks");
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// formatText
// ────────────────────────────────────────────────────────────────────────────

describe("formatText", () => {
  it("includes error pattern and fixes", () => {
    const result = getResultWithMatches();
    const text = formatText(result, false);
    expect(text).toContain("errordoc");
    expect(text).toContain("TypeError");
    expect(text).toContain("Fixes:");
  });

  it("shows no-match message when there are no matches", () => {
    const result = makeEmptyResult();
    const text = formatText(result, false);
    expect(text).toContain("No matching error patterns found");
    expect(text).toContain("42");
  });

  it("includes confidence percentage", () => {
    const result = getResultWithMatches();
    const text = formatText(result, false);
    expect(text).toMatch(/\d+% match/);
  });

  it("works with color enabled (default)", () => {
    const result = getResultWithMatches();
    const text = formatText(result);
    // ANSI escape codes should be present
    expect(text).toContain("\x1b[");
  });

  it("works with color disabled", () => {
    const result = getResultWithMatches();
    const text = formatText(result, false);
    // Should not contain ANSI escape codes
    expect(text).not.toContain("\x1b[");
  });

  it("shows framework tag when present", () => {
    const result = analyze(
      "Invalid hook call. Hooks can only be called inside of the body of a function component."
    );
    const text = formatText(result, false);
    if (result.matches[0]?.framework) {
      expect(text).toContain(`[${result.matches[0].framework}]`);
    }
  });
});
