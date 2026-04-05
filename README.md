# errordoc

> Turn cryptic error messages into plain-English explanations with actionable fixes. Zero dependencies.

[![npm version](https://img.shields.io/npm/v/errordoc)](https://www.npmjs.com/package/errordoc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```
$ npm run build 2>&1 | errordoc

errordoc — found 1 match in 0.4ms
────────────────────────────────────────────────────────────
  ✖ SyntaxError: import outside module  97% match

  You're using ES Module import syntax in a CommonJS file.
  Node.js defaults to CommonJS unless told otherwise.

  Fixes:
  → Add "type": "module" to package.json
  → Rename the file to .mjs extension
  → Use require() instead of import
  → If using TypeScript, set "module": "commonjs" in tsconfig.json
────────────────────────────────────────────────────────────
```

## Why errordoc?

- **55 matchers** covering Node.js, TypeScript, React, Next.js, Python, Rust, Go, Docker, PostgreSQL, MongoDB, Prisma, and more
- **Zero runtime dependencies** — the core engine is pure TypeScript
- **Actionable fixes** with runnable shell commands
- **Framework-aware** — detects your stack and gives context-specific advice
- **Typo detection** via Levenshtein distance (e.g., `exprss` → "Did you mean `express`?")
- **Multiple output formats** — colored terminal, JSON (for CI), Markdown

## Install

```bash
npm install -g errordoc    # Global CLI
npm install errordoc       # As a dependency
```

## CLI Usage

```bash
# Pipe error output
npm run build 2>&1 | errordoc
cargo build 2>&1 | errordoc
python app.py 2>&1 | errordoc

# Pass error as argument
errordoc "Cannot find module 'express'"
errordoc "TypeError: Cannot read properties of undefined"

# Output formats
errordoc --format json < error.log    # JSON (for CI/scripts)
errordoc --format markdown < error.log # Markdown

# Watch mode — continuously translate errors
npm run dev 2>&1 | errordoc --watch

# See all options
errordoc --help
```

## Programmatic API

```typescript
import { analyze, explain } from 'errordoc';

// Full analysis
const result = analyze("TypeError: Cannot read properties of undefined (reading 'map')");
console.log(result.matches[0].explanation);
// → You're trying to access "map" on undefined. The object doesn't exist...

console.log(result.matches[0].fixes);
// → [{ description: "Add a null check: obj?.map (optional chaining)", safe: false }, ...]

// Quick single match
const match = explain("ECONNREFUSED 127.0.0.1:5432");
console.log(match?.explanation);
// → Connection refused to 127.0.0.1:5432. PostgreSQL is not running...
```

### Options

```typescript
const result = analyze(errorText, {
  maxResults: 3,        // Max matches to return (default: 5)
  minConfidence: 0.5,   // Minimum confidence threshold 0-1 (default: 0.3)
  format: 'json',       // Output format: 'text' | 'json' | 'markdown'
});
```

## Supported Error Patterns

### Languages & Runtimes
| Category | Patterns |
|---|---|
| **Node.js** | MODULE_NOT_FOUND, ERR_REQUIRE_ESM, ERR_PACKAGE_PATH_NOT_EXPORTED, ECONNREFUSED, EADDRINUSE, EACCES, ENOENT, ETIMEDOUT, CORS, DNS/fetch errors |
| **TypeScript** | TS2307, TS2322, TS2339, TS2345, TS2304, TS2531, TS2532, TS2769, TS2741, TS7006, TS18046, TS1005, TS1128, TS2694, TS2305 |
| **Python** | ModuleNotFoundError, SyntaxError, IndentationError, TypeError, KeyError, AttributeError, ValueError |
| **Rust** | E0382 (moved value), E0502 (borrow conflict), E0505 (moved while borrowed), E0106/E0621 (lifetimes), E0277 (missing trait), cargo errors |
| **Go** | nil pointer dereference, import cycle, unused imports, deadlock, panic, go mod errors |

### Frameworks
| Category | Patterns |
|---|---|
| **React** | Invalid hook call, missing key prop, hydration mismatch, max update depth, invalid element type, minified errors |
| **Next.js** | Server/Client component mismatch, dynamic server usage, build errors, image hostname, 404 |
| **Vite** | Failed imports, dependency optimization |
| **Webpack** | Module not found, loader failures |
| **ESLint** | Config loading, rule configuration |

### Databases & Infrastructure
| Category | Patterns |
|---|---|
| **Prisma** | P1001-P2025, client not generated |
| **MongoDB** | E11000 duplicate key, auth failure, connection errors, validation |
| **PostgreSQL** | Relation/column not found, syntax errors |
| **Docker** | Daemon not running, port conflicts, no space, image not found |
| **Git** | Merge conflicts, detached HEAD, branch divergence, SSH auth |

### General
| Category | Patterns |
|---|---|
| **Auth** | JWT expired/malformed/invalid signature |
| **Memory** | Heap out of memory, OOMKilled |
| **System** | Permission denied, SSH auth, segfault, env vars |

## Architecture

```
src/
├── engine.ts          — Core analysis engine
├── formatter.ts       — Output formatting (text/json/markdown)
├── cli.ts             — CLI entry point
├── types.ts           — TypeScript interfaces
├─��� matchers/
│   ├── index.ts       — Matcher registry (55 matchers)
│   ├── node-module.ts ��� Node.js module resolution errors
│   ├─�� node-runtime.ts — TypeError, ReferenceError, SyntaxError, RangeError
│   ├── node-network.ts — ECONNREFUSED, EADDRINUSE, CORS, timeouts
│   ├── typescript.ts  — TS error codes (15 patterns)
│   ├── react.ts       — Hook errors, hydration, keys, elements
│   ├── nextjs.ts      — Server components, build, images
│   ├── python.ts      — Import, syntax, type, key, attribute errors
│   ├── rust.ts        — Borrow checker, lifetimes, traits, cargo
│   ├── go.ts          — Nil pointer, import cycle, deadlock, modules
│   ├── database.ts    — Prisma, MongoDB, PostgreSQL
│   ├── build-tools.ts — Webpack, Vite, ESLint, Docker
│   └── misc.ts        — JWT, OOM, git, permissions, segfault
└── utils/
    ├── levenshtein.ts — Fuzzy matching for typo detection
    └── extract.ts     — Regex helpers, framework detection, ANSI stripping
```

## How It Works

1. **Strip ANSI** — Clean terminal escape codes from input
2. **Detect frameworks** — Auto-detect React, Next.js, Python, Rust, Go, etc. from the error text
3. **Pattern matching** — Run through 55 matchers ordered by specificity (framework-specific → language-specific → generic)
4. **Fuzzy matching** — For module/import errors, use Levenshtein distance to suggest correct names
5. **Rank by confidence** — Each match has a 0-1 confidence score; results sorted highest first

## Contributing

```bash
git clone https://github.com/Nixxx19/errordoc.git
cd errordoc
npm install
npm run dev          # Watch mode
npm test             # Run tests
npm run build        # Production build
```

Adding a new matcher:
1. Create or edit a file in `src/matchers/`
2. Export a `Matcher` object with `id`, `name`, `frameworks`, `test()`, and `match()`
3. Register it in `src/matchers/index.ts`
4. Add tests in `tests/`

## License

MIT
