import type { Matcher } from "../types.js";

// Node.js core
import { moduleNotFound, resolveError, missingExport } from "./node-module.js";
import { referenceError, typeError, syntaxError, rangeError } from "./node-runtime.js";
import { econnrefused, eaddrinuse, eacces, enoent, etimeout, corsError, fetchError } from "./node-network.js";

// TypeScript
import { tsTypeError } from "./typescript.js";

// React
import {
  reactHookError, reactKeyError, reactHydrationError,
  reactMinifiedError, reactMaxUpdateDepth, reactInvalidElement,
} from "./react.js";

// Next.js
import {
  nextServerComponent, nextDynamicServerUsage,
  nextBuildError, nextImageError, nextNotFound,
} from "./nextjs.js";

// Python
import {
  pythonModuleNotFound, pythonSyntaxError, pythonTypeError,
  pythonKeyError, pythonAttributeError, pythonValueError,
} from "./python.js";

// Rust
import { rustBorrowError, rustLifetimeError, rustTraitError, rustCargoError } from "./rust.js";

// Go
import {
  goUndefined, goImportCycle, goNilPointer,
  goUnusedImport, goModError, goGoroutineLeak,
} from "./go.js";

// Databases
import { prismaError, mongoError, postgresError } from "./database.js";

// Build tools
import { webpackError, viteError, eslintError, dockerError } from "./build-tools.js";

// Misc
import {
  envVarMissing, jwtError, outOfMemory,
  gitError, permissionDenied, segfault,
} from "./misc.js";

/** All registered matchers, ordered by specificity (most specific first) */
export const matchers: Matcher[] = [
  // Framework-specific (most specific)
  nextServerComponent,
  nextDynamicServerUsage,
  nextBuildError,
  nextImageError,
  nextNotFound,
  reactHookError,
  reactKeyError,
  reactHydrationError,
  reactMinifiedError,
  reactMaxUpdateDepth,
  reactInvalidElement,

  // Language-specific
  tsTypeError,
  pythonModuleNotFound,
  pythonSyntaxError,
  pythonTypeError,
  pythonKeyError,
  pythonAttributeError,
  pythonValueError,
  rustBorrowError,
  rustLifetimeError,
  rustTraitError,
  rustCargoError,
  goUndefined,
  goImportCycle,
  goNilPointer,
  goUnusedImport,
  goModError,
  goGoroutineLeak,

  // Database
  prismaError,
  mongoError,
  postgresError,

  // Build tools
  webpackError,
  viteError,
  eslintError,
  dockerError,

  // Node.js (broader matchers)
  moduleNotFound,
  resolveError,
  missingExport,
  econnrefused,
  eaddrinuse,
  eacces,
  enoent,
  etimeout,
  corsError,
  fetchError,

  // Generic / cross-language
  envVarMissing,
  jwtError,
  outOfMemory,
  gitError,
  permissionDenied,
  segfault,
  referenceError,
  typeError,
  syntaxError,
  rangeError,
];

/** Total number of error patterns covered */
export const PATTERN_COUNT = matchers.length;
