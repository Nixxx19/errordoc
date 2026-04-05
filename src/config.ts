import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface ErrorDocConfig {
  maxResults?: number;
  minConfidence?: number;
  format?: "text" | "json" | "markdown";
  ignore?: string[];
  noColor?: boolean;
}

function loadConfigFile(filePath: string): ErrorDocConfig | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as ErrorDocConfig;
  } catch {
    return null;
  }
}

/**
 * Look for `.errordocrc.json` in the current directory, then the home directory.
 * Returns the parsed config or an empty object if no config file is found.
 */
export function loadConfig(): ErrorDocConfig {
  const cwd = path.join(process.cwd(), ".errordocrc.json");
  const home = path.join(os.homedir(), ".errordocrc.json");

  return loadConfigFile(cwd) ?? loadConfigFile(home) ?? {};
}

/**
 * Merge a config file with CLI arguments. CLI args take priority.
 * Only overrides fields that were explicitly set in `cliArgs` (i.e., not left at defaults).
 */
export function mergeConfig(
  fileConfig: ErrorDocConfig,
  cliArgs: {
    format?: string;
    maxResults?: number;
    minConfidence?: number;
    noColor?: boolean;
  },
  cliWasSet: {
    format?: boolean;
    maxResults?: boolean;
    minConfidence?: boolean;
    noColor?: boolean;
  }
): ErrorDocConfig {
  return {
    maxResults: cliWasSet.maxResults ? cliArgs.maxResults : (fileConfig.maxResults ?? cliArgs.maxResults),
    minConfidence: cliWasSet.minConfidence ? cliArgs.minConfidence : (fileConfig.minConfidence ?? cliArgs.minConfidence),
    format: cliWasSet.format ? (cliArgs.format as ErrorDocConfig["format"]) : (fileConfig.format ?? (cliArgs.format as ErrorDocConfig["format"])),
    noColor: cliWasSet.noColor ? cliArgs.noColor : (fileConfig.noColor ?? cliArgs.noColor),
    ignore: fileConfig.ignore,
  };
}
