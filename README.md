# errordoc

Pipe your errors, get actual answers. No more googling stack traces at 2am.

[![npm version](https://img.shields.io/npm/v/@nixxx19/errordoc)](https://www.npmjs.com/package/@nixxx19/errordoc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```
$ npm run build 2>&1 | errordoc

  ✖ SyntaxError: import outside module  97% match

  You're using ES Module import syntax in a CommonJS file.
  Node.js defaults to CommonJS unless told otherwise.

  Fixes:
  ⚡ Add "type": "module" to package.json
  → Rename the file to .mjs extension
  → Use require() instead of import
```

## what is this

You know those errors that make you open 4 browser tabs? This tool just tells you what's wrong and how to fix it. Directly in your terminal.

- 55 error patterns — Node, TypeScript, React, Next.js, Python, Rust, Go, Prisma, Mongo, Postgres, Docker, Git
- zero dependencies
- catches typos (`exprss` → did you mean `express`?)
- gives you actual commands to run, not just explanations
- works with any language — just pipe stderr into it

## install

```bash
npm install -g @nixxx19/errordoc
```

## usage

```bash
# pipe anything
npm run build 2>&1 | errordoc
cargo build 2>&1 | errordoc
python app.py 2>&1 | errordoc
go run main.go 2>&1 | errordoc

# or just pass the error directly
errordoc "Cannot find module 'express'"
errordoc "TypeError: Cannot read properties of undefined"

# json output for CI
errordoc --format json < error.log

# watch mode — keeps translating as errors come in
npm run dev 2>&1 | errordoc --watch
```

## use it in code

```typescript
import { analyze, explain } from '@nixxx19/errordoc';

const result = analyze("TypeError: Cannot read properties of undefined (reading 'map')");
console.log(result.matches[0].explanation);
// → You're trying to access "map" on undefined...

// or quick mode
const match = explain("ECONNREFUSED 127.0.0.1:5432");
// → Connection refused. PostgreSQL is not running...
```

```typescript
// options
analyze(errorText, {
  maxResults: 3,
  minConfidence: 0.5,
  format: 'json',
});
```

## what it catches

**languages** — Node.js (MODULE_NOT_FOUND, ECONNREFUSED, EADDRINUSE, CORS, etc), TypeScript (15 TS error codes), Python (ModuleNotFound, KeyError, AttributeError, IndentationError, etc), Rust (borrow checker E0382/E0502/E0505, lifetimes, traits, cargo), Go (nil pointer, deadlock, import cycle, unused imports)

**frameworks** — React (hooks, hydration, keys, max update depth), Next.js (server components, dynamic server usage, image config), Vite, Webpack, ESLint

**databases** — Prisma (P1001-P2025), MongoDB (duplicate key, auth, connection), PostgreSQL (missing tables/columns, syntax)

**infra** — Docker (daemon down, port conflicts, disk space, missing images), Git (merge conflicts, detached HEAD, SSH auth), JWT errors, OOM, segfaults, permission denied

## how it works

1. strips ANSI codes from your terminal output
2. auto-detects what framework/language you're using
3. runs through 55 matchers ordered most-specific-first
4. fuzzy matches module names with levenshtein distance
5. ranks results by confidence and shows the best matches

## project structure

```
src/
├── engine.ts           core matching logic
├── formatter.ts        terminal / json / markdown output
├── cli.ts              cli entry point
├── types.ts            typescript types
├── matchers/
│   ├── node-module.ts      module resolution
│   ├── node-runtime.ts     TypeError, ReferenceError, etc
│   ├── node-network.ts     ECONNREFUSED, CORS, timeouts
│   ├── typescript.ts       TS error codes
│   ├── react.ts            hooks, hydration, keys
│   ├── nextjs.ts           server components, builds
│   ├── python.ts           python-specific errors
│   ├── rust.ts             borrow checker, lifetimes
│   ├── go.ts               nil pointer, deadlock
│   ├── database.ts         prisma, mongo, postgres
│   ├── build-tools.ts      webpack, vite, eslint, docker
│   └── misc.ts             jwt, oom, git, permissions
└── utils/
    ├── levenshtein.ts      typo detection
    └── extract.ts          regex helpers, framework detection
```

## contributing

```bash
git clone https://github.com/Nixxx19/errordoc.git
cd errordoc
npm install
npm run dev       # watch mode
npm test          # run tests
```

adding a matcher is straightforward — create a `Matcher` object with `test()` and `match()`, drop it in `src/matchers/`, register it in the index, add a test. check existing matchers for the pattern.

## license

MIT
