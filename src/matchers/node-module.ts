import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";
import { findClosest } from "../utils/levenshtein.js";

const COMMON_MODULES = [
  "express", "lodash", "axios", "dotenv", "cors", "body-parser",
  "mongoose", "pg", "redis", "jsonwebtoken", "bcrypt", "multer",
  "nodemailer", "socket.io", "uuid", "chalk", "commander", "inquirer",
  "winston", "morgan", "helmet", "passport", "sequelize", "prisma",
  "zod", "joi", "yup", "date-fns", "moment", "dayjs",
  "react", "react-dom", "next", "vue", "svelte", "angular",
  "typescript", "ts-node", "tsx", "vitest", "jest", "mocha",
  "webpack", "vite", "rollup", "esbuild", "tsup", "turbo",
];

export const moduleNotFound: Matcher = {
  id: "node-module-not-found",
  name: "Module Not Found",
  frameworks: ["node"],
  test: (input) =>
    /Cannot find module|MODULE_NOT_FOUND|Cannot find package/.test(input),
  match(input) {
    const moduleName =
      extractGroup(input, /Cannot find module '([^']+)'/) ??
      extractGroup(input, /Cannot find package '([^']+)'/) ??
      extractGroup(input, /Error: Cannot find module '([^']+)'/);

    if (!moduleName) return null;

    const isLocal = moduleName.startsWith(".") || moduleName.startsWith("/");
    const suggestion = !isLocal ? findClosest(moduleName, COMMON_MODULES) : null;

    const fixes = isLocal
      ? [
          {
            description: `Check that the file "${moduleName}" exists and the path is correct`,
            safe: false,
          },
          {
            description: "Verify the file extension (.js, .ts, .json, .mjs)",
            safe: false,
          },
        ]
      : [
          {
            description: `Install the missing package`,
            command: `npm install ${moduleName}`,
            safe: true,
          },
          ...(suggestion && suggestion !== moduleName
            ? [
                {
                  description: `Did you mean "${suggestion}"?`,
                  command: `npm install ${suggestion}`,
                  safe: true,
                },
              ]
            : []),
          {
            description: "If using TypeScript, install type definitions",
            command: `npm install -D @types/${moduleName}`,
            safe: true,
          },
        ];

    return {
      id: this.id,
      pattern: "MODULE_NOT_FOUND",
      explanation: isLocal
        ? `Node.js cannot find the local file "${moduleName}". The file path is wrong, the file doesn't exist, or the extension is missing.`
        : `The npm package "${moduleName}" is not installed. It's either missing from package.json or not yet installed.`,
      fixes,
      confidence: 0.95,
      category: "module",
      matched: input.match(/Cannot find (module|package) '[^']+'/)![0],
      docsUrl: "https://nodejs.org/api/errors.html#module_not_found",
    };
  },
};

export const resolveError: Matcher = {
  id: "node-err-require-esm",
  name: "ESM/CJS Mismatch",
  frameworks: ["node"],
  test: (input) =>
    /ERR_REQUIRE_ESM|require\(\) of ES Module|Must use import/.test(input),
  match(input) {
    const moduleName = extractGroup(
      input,
      /require\(\) of ES Module .*?([^\\/]+?)(?:\/index)?\.(?:js|mjs)/
    );

    return {
      id: this.id,
      pattern: "ERR_REQUIRE_ESM",
      explanation: `You're using require() to load an ES Module${moduleName ? ` ("${moduleName}")` : ""}. This package has migrated to ESM-only and can't be loaded with require().`,
      fixes: [
        {
          description: 'Add "type": "module" to your package.json and use import syntax',
          safe: false,
        },
        {
          description: "Use dynamic import: const pkg = await import('package')",
          safe: false,
        },
        {
          description: "Downgrade the package to the last CJS-compatible version",
          safe: false,
        },
      ],
      confidence: 0.95,
      category: "module",
      matched: input.match(/ERR_REQUIRE_ESM|require\(\) of ES Module/)![0],
      docsUrl: "https://nodejs.org/api/errors.html#err_require_esm",
    };
  },
};

export const missingExport: Matcher = {
  id: "node-missing-export",
  name: "Missing Package Export",
  frameworks: ["node"],
  test: (input) => /ERR_PACKAGE_PATH_NOT_EXPORTED|Package subpath/.test(input),
  match(input) {
    const subpath = extractGroup(input, /Package subpath '([^']+)'/);
    const pkg = extractGroup(input, /in package ([^\s]+)/);

    return {
      id: this.id,
      pattern: "ERR_PACKAGE_PATH_NOT_EXPORTED",
      explanation: `The subpath${subpath ? ` "${subpath}"` : ""} is not exported by${pkg ? ` "${pkg}"` : " the package"}. The package's "exports" field in package.json doesn't include this path.`,
      fixes: [
        {
          description: "Check the package docs for the correct import path",
          safe: false,
        },
        {
          description: "Try importing from the package root instead",
          safe: false,
        },
        {
          description: "Update the package — the export map may have changed",
          command: pkg ? `npm update ${pkg}` : undefined,
          safe: true,
        },
      ],
      confidence: 0.9,
      category: "module",
      matched: input.match(/Package subpath '[^']+' is not.*exported|ERR_PACKAGE_PATH_NOT_EXPORTED/)![0],
    };
  },
};
