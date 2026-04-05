import type { AnalysisResult, ErrorMatch } from "./types.js";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
};

function formatMatch(match: ErrorMatch, index: number, useColor: boolean): string {
  const c = useColor ? COLORS : Object.fromEntries(Object.keys(COLORS).map((k) => [k, ""]));
  const lines: string[] = [];

  const confidence = Math.round(match.confidence * 100);
  const confidenceColor = confidence >= 90 ? c.green : confidence >= 70 ? c.yellow : c.dim;

  lines.push(
    `${c.bold}${c.red}  ✖ ${match.pattern}${c.reset}  ${confidenceColor}${confidence}% match${c.reset}` +
      (match.framework ? `  ${c.dim}[${match.framework}]${c.reset}` : "")
  );
  lines.push("");
  lines.push(`  ${c.white}${match.explanation}${c.reset}`);
  lines.push("");

  if (match.fixes.length > 0) {
    lines.push(`  ${c.bold}${c.cyan}Fixes:${c.reset}`);
    for (const fix of match.fixes) {
      const prefix = fix.command ? `${c.green}⚡` : `${c.yellow}→`;
      lines.push(`  ${prefix} ${fix.description}${c.reset}`);
      if (fix.command) {
        lines.push(`    ${c.dim}$ ${fix.command}${c.reset}`);
      }
    }
  }

  if (match.docsUrl) {
    lines.push("");
    lines.push(`  ${c.dim}📖 ${match.docsUrl}${c.reset}`);
  }

  return lines.join("\n");
}

export function formatText(result: AnalysisResult, useColor = true): string {
  const c = useColor ? COLORS : Object.fromEntries(Object.keys(COLORS).map((k) => [k, ""]));

  if (result.matches.length === 0) {
    return `${c.dim}No matching error patterns found.${c.reset}\n${c.dim}Checked ${result.patternsChecked} patterns in ${result.duration}ms${c.reset}`;
  }

  const header = `${c.bold}${c.white}errordoc${c.reset} ${c.dim}— found ${result.matches.length} match${result.matches.length > 1 ? "es" : ""} in ${result.duration}ms${c.reset}`;
  const separator = `${c.dim}${"─".repeat(60)}${c.reset}`;

  const body = result.matches
    .map((m, i) => formatMatch(m, i, useColor))
    .join(`\n${separator}\n`);

  const footer = result.detectedFrameworks.length > 0
    ? `\n${c.dim}Detected: ${result.detectedFrameworks.join(", ")}${c.reset}`
    : "";

  return `\n${header}\n${separator}\n${body}\n${separator}${footer}\n`;
}

export function formatJson(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatMarkdown(result: AnalysisResult): string {
  if (result.matches.length === 0) {
    return `No matching error patterns found. Checked ${result.patternsChecked} patterns.`;
  }

  const lines: string[] = [];
  lines.push(`# errordoc analysis\n`);
  lines.push(`Found **${result.matches.length}** match(es) in ${result.duration}ms\n`);

  if (result.detectedFrameworks.length > 0) {
    lines.push(`**Detected frameworks:** ${result.detectedFrameworks.join(", ")}\n`);
  }

  for (const match of result.matches) {
    lines.push(`## ${match.pattern} (${Math.round(match.confidence * 100)}% confidence)\n`);
    lines.push(`${match.explanation}\n`);

    if (match.fixes.length > 0) {
      lines.push(`### Fixes\n`);
      for (const fix of match.fixes) {
        lines.push(`- ${fix.description}`);
        if (fix.command) {
          lines.push(`  \`\`\`\n  ${fix.command}\n  \`\`\``);
        }
      }
      lines.push("");
    }

    if (match.docsUrl) {
      lines.push(`[Documentation](${match.docsUrl})\n`);
    }
  }

  return lines.join("\n");
}
