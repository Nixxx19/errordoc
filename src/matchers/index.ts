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

// Express.js
import {
  expressRouteNotFound, expressBodyUndefined, expressViewError,
  expressPayloadTooLarge, expressHeadersSent,
} from "./express.js";

// AWS
import {
  awsAccessDenied, awsNoSuchBucket, awsNoSuchKey,
  awsInvalidAccessKey, awsExpiredToken, awsLambdaTimeout,
  awsLambdaMemory, awsRegionNotFound,
} from "./aws.js";

// Firebase
import {
  firebaseUserNotFound, firebaseWrongPassword, firebaseEmailInUse,
  firebaseWeakPassword, firebasePermissionDenied, firebaseDeadlineExceeded,
} from "./firebase.js";

// Supabase
import {
  supabaseJwtExpired, supabaseRlsViolation, supabaseRelationNotExist,
  supabaseFunctionNotFound, supabasePgrstError,
} from "./supabase.js";

// npm / package managers
import {
  npmEresolve, npmEacces, npmCbNeverCalled,
  npmEperm, npmDeprecated, npmE404, npmEtarget,
} from "./npm.js";

// Tailwind / CSS
import {
  tailwindModuleNotFound, postcssPluginError,
  tailwindUnknownAtRule, tailwindApplyError,
} from "./tailwind.js";

// Auth
import {
  oauthError, corsPreflightAuth, unauthorized401,
  forbidden403, sessionExpired, csrfTokenMismatch,
} from "./auth.js";

// Memory / Performance
import {
  nodeHeapOutOfMemory, enomem, workerThreadError,
  workerOutOfMemory, eventLoopBlocked,
} from "./memory-perf.js";

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

  // Express.js
  expressRouteNotFound,
  expressBodyUndefined,
  expressViewError,
  expressPayloadTooLarge,
  expressHeadersSent,

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

  // Cloud services — AWS
  awsAccessDenied,
  awsNoSuchBucket,
  awsNoSuchKey,
  awsInvalidAccessKey,
  awsExpiredToken,
  awsLambdaTimeout,
  awsLambdaMemory,
  awsRegionNotFound,

  // Cloud services — Firebase
  firebaseUserNotFound,
  firebaseWrongPassword,
  firebaseEmailInUse,
  firebaseWeakPassword,
  firebasePermissionDenied,
  firebaseDeadlineExceeded,

  // Cloud services — Supabase
  supabaseJwtExpired,
  supabaseRlsViolation,
  supabaseRelationNotExist,
  supabaseFunctionNotFound,
  supabasePgrstError,

  // Database
  prismaError,
  mongoError,
  postgresError,

  // Build tools
  webpackError,
  viteError,
  eslintError,
  dockerError,

  // Tailwind / CSS
  tailwindModuleNotFound,
  postcssPluginError,
  tailwindUnknownAtRule,
  tailwindApplyError,

  // npm / package managers
  npmEresolve,
  npmEacces,
  npmCbNeverCalled,
  npmEperm,
  npmDeprecated,
  npmE404,
  npmEtarget,

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

  // Auth
  oauthError,
  corsPreflightAuth,
  unauthorized401,
  forbidden403,
  sessionExpired,
  csrfTokenMismatch,

  // Memory / Performance
  nodeHeapOutOfMemory,
  enomem,
  workerThreadError,
  workerOutOfMemory,
  eventLoopBlocked,

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
