import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const goUndefined: Matcher = {
  id: "go-undefined",
  name: "Go Undefined Error",
  frameworks: ["go"],
  test: (input) => /undefined:/.test(input) && /\.go:\d+/.test(input),
  match(input) {
    const name = extractGroup(input, /undefined: (\w+)/);
    const file = extractGroup(input, /(\S+\.go):\d+/);

    return {
      id: this.id,
      pattern: "Go: undefined",
      explanation: `"${name ?? "?"}" is undefined${file ? ` in ${file}` : ""}. It hasn't been declared, is unexported (lowercase), or is in a different package.`,
      fixes: [
        { description: `Check if "${name}" is spelled correctly and declared`, safe: false },
        { description: "In Go, names starting with lowercase are unexported (private to the package)", safe: false },
        { description: "Import the package that defines it", safe: false },
        { description: "Check that all files in the package have the same 'package' declaration", safe: false },
      ],
      confidence: 0.88,
      category: "type",
      framework: "go",
      matched: `undefined: ${name}`,
    };
  },
};

export const goImportCycle: Matcher = {
  id: "go-import-cycle",
  name: "Go Import Cycle",
  frameworks: ["go"],
  test: (input) => /import cycle not allowed/.test(input),
  match(input) {
    const packages = extractGroup(input, /imports (.+)/);

    return {
      id: this.id,
      pattern: "Go: import cycle",
      explanation: `Circular import detected${packages ? `: ${packages}` : ""}. Package A imports B, and B imports A (directly or indirectly). Go forbids this.`,
      fixes: [
        { description: "Move shared types to a separate package that both can import", safe: false },
        { description: "Use interfaces to break the dependency", safe: false },
        { description: "Merge the packages if they're tightly coupled", safe: false },
      ],
      confidence: 0.95,
      category: "build",
      framework: "go",
      matched: input.match(/import cycle not allowed.*/)![0],
    };
  },
};

export const goNilPointer: Matcher = {
  id: "go-nil-pointer",
  name: "Go Nil Pointer Dereference",
  frameworks: ["go"],
  test: (input) => /nil pointer dereference|runtime error: invalid memory address/.test(input),
  match(input) {
    const file = extractGroup(input, /(\S+\.go):(\d+)/);

    return {
      id: this.id,
      pattern: "Go: nil pointer dereference",
      explanation: `Nil pointer dereference${file ? ` in ${file}` : ""}. You're accessing a method or field on a nil pointer — the value was never initialized or a function returned nil.`,
      fixes: [
        { description: "Add nil checks: if ptr != nil { ptr.Method() }", safe: false },
        { description: "Check the return value of functions that can return nil", safe: false },
        { description: "Initialize structs with default values using &StructName{}", safe: false },
        { description: "Use the stack trace to find which variable is nil", safe: false },
      ],
      confidence: 0.95,
      category: "runtime",
      framework: "go",
      matched: "runtime error: invalid memory address or nil pointer dereference",
    };
  },
};

export const goUnusedImport: Matcher = {
  id: "go-unused-import",
  name: "Go Unused Import",
  frameworks: ["go"],
  test: (input) => /imported and not used/.test(input),
  match(input) {
    const pkg = extractGroup(input, /"([^"]+)" imported and not used/);

    return {
      id: this.id,
      pattern: "Go: unused import",
      explanation: `Package "${pkg ?? "?"}" is imported but not used. Go doesn't allow unused imports.`,
      fixes: [
        { description: `Remove the import or use it`, safe: false },
        { description: "Use _ to blank-import for side effects: import _ \"pkg\"", safe: false },
        { description: "Use goimports to auto-manage imports", command: "goimports -w .", safe: true },
      ],
      confidence: 0.95,
      category: "build",
      framework: "go",
      matched: `"${pkg}" imported and not used`,
    };
  },
};

export const goModError: Matcher = {
  id: "go-mod",
  name: "Go Module Error",
  frameworks: ["go"],
  test: (input) => /go: (?:cannot find|module.*not found|no required module provides)/.test(input),
  match(input) {
    const pkg = extractGroup(input, /module (\S+).*not found|no required module provides package (\S+)/);

    return {
      id: this.id,
      pattern: "Go: module not found",
      explanation: `Go module${pkg ? ` "${pkg}"` : ""} not found. It's not in go.mod or hasn't been downloaded.`,
      fixes: [
        { description: "Run go mod tidy to add missing dependencies", command: "go mod tidy", safe: true },
        { description: "Download dependencies", command: "go mod download", safe: true },
        { description: "Check the module path for typos", safe: false },
        { description: "If it's a private repo, set GOPRIVATE", safe: false },
      ],
      confidence: 0.9,
      category: "dependency",
      framework: "go",
      matched: input.match(/go: (?:cannot find|module.*not found|no required module provides).+/)![0],
    };
  },
};

export const goGoroutineLeak: Matcher = {
  id: "go-goroutine-panic",
  name: "Go Panic / Goroutine Error",
  frameworks: ["go"],
  test: (input) => /goroutine \d+ \[|panic:|all goroutines are asleep/.test(input),
  match(input) {
    const panicMsg = extractGroup(input, /panic: (.+)/);
    const deadlock = /all goroutines are asleep - deadlock/.test(input);

    if (deadlock) {
      return {
        id: this.id,
        pattern: "Go: deadlock",
        explanation: "All goroutines are asleep — deadlock detected. All goroutines are waiting for something that will never happen (channels, mutexes, etc.).",
        fixes: [
          { description: "Check for unbuffered channels that no goroutine is reading from", safe: false },
          { description: "Ensure WaitGroups are correctly balanced (Add/Done/Wait)", safe: false },
          { description: "Check mutex lock/unlock pairing — use defer mu.Unlock()", safe: false },
          { description: "Use 'go run -race' to detect race conditions", command: "go run -race .", safe: true },
        ],
        confidence: 0.95,
        category: "runtime",
        framework: "go",
        matched: "fatal error: all goroutines are asleep - deadlock!",
      };
    }

    return {
      id: this.id,
      pattern: "Go: panic",
      explanation: `Unrecovered panic: ${panicMsg ?? "unknown"}. The program crashed — use recover() in a defer to handle panics gracefully.`,
      fixes: [
        { description: "Add a recover() in a deferred function to catch the panic", safe: false },
        { description: "Return errors instead of panicking where possible", safe: false },
        { description: "Check the stack trace to find the root cause", safe: false },
      ],
      confidence: 0.85,
      category: "runtime",
      framework: "go",
      matched: input.match(/panic: .+|all goroutines are asleep/)![0],
    };
  },
};
