import { describe, it, expect } from "vitest";
import { analyze, explain } from "../src/engine";

describe("analyze", () => {
  it("returns empty matches for unknown input", () => {
    const result = analyze("hello world");
    expect(result.matches).toHaveLength(0);
    expect(result.patternsChecked).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("detects frameworks from input", () => {
    const result = analyze("Error in ./src/App.tsx at React.createElement");
    expect(result.detectedFrameworks).toContain("react");
  });

  it("respects maxResults option", () => {
    const result = analyze(
      "TypeError: Cannot read properties of undefined (reading 'x')\nRangeError: Maximum call stack size exceeded",
      { maxResults: 1 }
    );
    expect(result.matches.length).toBeLessThanOrEqual(1);
  });

  it("respects minConfidence option", () => {
    const result = analyze("TypeError: something weird happened", {
      minConfidence: 0.99,
    });
    expect(result.matches).toHaveLength(0);
  });
});

describe("explain", () => {
  it("returns null for unknown input", () => {
    expect(explain("everything is fine")).toBeNull();
  });

  it("returns top match for known errors", () => {
    const match = explain(
      "TypeError: Cannot read properties of undefined (reading 'map')"
    );
    expect(match).not.toBeNull();
    expect(match!.pattern).toContain("TypeError");
    expect(match!.confidence).toBeGreaterThan(0.8);
  });
});

describe("Node.js module errors", () => {
  it("matches Cannot find module with package name", () => {
    const result = analyze("Error: Cannot find module 'express'");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("express");
    expect(result.matches[0].fixes.some((f) => f.command?.includes("npm install"))).toBe(true);
  });

  it("matches local file module not found", () => {
    const result = analyze("Error: Cannot find module './utils/helper'");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("file path");
  });

  it("suggests similar module names via Levenshtein", () => {
    const result = analyze("Error: Cannot find module 'exprss'");
    expect(result.matches.length).toBeGreaterThan(0);
    const hasSuggestion = result.matches[0].fixes.some((f) =>
      f.description.includes("express")
    );
    expect(hasSuggestion).toBe(true);
  });

  it("matches ERR_REQUIRE_ESM", () => {
    const result = analyze(
      "ERR_REQUIRE_ESM: require() of ES Module node_modules/chalk/index.js"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("ES Module");
  });
});

describe("Node.js runtime errors", () => {
  it("matches ReferenceError with typo suggestion", () => {
    const result = analyze("ReferenceError: consle is not defined");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("consle");
    expect(result.matches[0].fixes.some((f) => f.description.includes("console"))).toBe(true);
  });

  it("detects browser API in Node.js context", () => {
    const result = analyze("ReferenceError: window is not defined");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("browser");
  });

  it("matches TypeError: not a function", () => {
    const result = analyze("TypeError: myVar.map is not a function");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].pattern).toContain("not a function");
  });

  it("matches Cannot read properties of null", () => {
    const result = analyze(
      "TypeError: Cannot read properties of null (reading 'id')"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("null");
  });

  it("matches stack overflow", () => {
    const result = analyze("RangeError: Maximum call stack size exceeded");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("recursion");
  });

  it("matches SyntaxError: import outside module", () => {
    const result = analyze(
      "SyntaxError: Cannot use import statement outside a module"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].confidence).toBeGreaterThan(0.9);
  });

  it("matches SyntaxError: JSON parse", () => {
    const result = analyze(
      "SyntaxError: Unexpected token < in JSON at position 0"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("JSON");
  });

  it("matches SyntaxError: await outside async", () => {
    const result = analyze(
      "SyntaxError: await is only valid in async function"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("async");
  });
});

describe("Network errors", () => {
  it("matches ECONNREFUSED with port detection", () => {
    const result = analyze("Error: connect ECONNREFUSED 127.0.0.1:5432");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("PostgreSQL");
  });

  it("matches EADDRINUSE", () => {
    const result = analyze("Error: listen EADDRINUSE: address already in use :::3000");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("3000");
  });

  it("matches CORS error", () => {
    const result = analyze(
      "Access to XMLHttpRequest has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].pattern).toContain("CORS");
  });

  it("matches ENOENT", () => {
    const result = analyze(
      "Error: ENOENT: no such file or directory, open '/app/config.json'"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("config.json");
  });

  it("matches timeout errors", () => {
    const result = analyze("Error: connect ETIMEDOUT 52.1.2.3:443");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].pattern).toContain("Timeout");
  });

  it("matches DNS/fetch errors", () => {
    const result = analyze("Error: getaddrinfo ENOTFOUND api.example.com");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("api.example.com");
  });
});

describe("TypeScript errors", () => {
  it("matches TS2307 module not found", () => {
    const result = analyze(
      "src/app.tsx(5,22): error TS2307: Cannot find module './components/Header' or its corresponding type declarations."
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches.some((m) => m.pattern.includes("TS2307"))).toBe(true);
  });

  it("matches TS2339 property does not exist", () => {
    const result = analyze(
      "src/index.ts(10,5): error TS2339: Property 'foo' does not exist on type 'Bar'."
    );
    expect(result.matches.length).toBeGreaterThan(0);
  });
});

describe("React errors", () => {
  it("matches invalid hook call", () => {
    const result = analyze(
      "Invalid hook call. Hooks can only be called inside of the body of a function component."
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].framework).toBe("react");
  });

  it("matches missing key prop", () => {
    const result = analyze(
      'Warning: Each child in a list should have a unique "key" prop.'
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].pattern).toContain("key");
  });

  it("matches hydration mismatch", () => {
    const result = analyze("Hydration failed because the initial UI does not match");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].pattern).toContain("Hydration");
  });

  it("matches max update depth", () => {
    const result = analyze("Error: Maximum update depth exceeded.");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation.toLowerCase()).toContain("infinite");
  });
});

describe("Python errors", () => {
  it("matches ModuleNotFoundError", () => {
    const result = analyze("ModuleNotFoundError: No module named 'flask'");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].fixes.some((f) => f.command?.includes("pip install flask"))).toBe(true);
  });

  it("matches KeyError", () => {
    const result = analyze("KeyError: 'username'");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("username");
  });

  it("matches AttributeError on NoneType", () => {
    const result = analyze(
      "AttributeError: 'NoneType' object has no attribute 'split'"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("None");
  });

  it("matches IndentationError", () => {
    const result = analyze(
      'File "app.py", line 5\n    SyntaxError: unexpected unindent'
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("indentation");
  });
});

describe("Rust errors", () => {
  it("matches borrow checker E0382", () => {
    const result = analyze("error[E0382]: use of moved value: `x`");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("moved");
  });

  it("matches trait not implemented", () => {
    const result = analyze(
      "error[E0277]: the trait `Display` is not implemented for `MyStruct`"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("Display");
  });
});

describe("Go errors", () => {
  it("matches nil pointer dereference", () => {
    const result = analyze(
      "panic: runtime error: invalid memory address or nil pointer dereference"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("nil");
  });

  it("matches deadlock", () => {
    const result = analyze("fatal error: all goroutines are asleep - deadlock!");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("deadlock");
  });

  it("matches unused import", () => {
    const result = analyze('"fmt" imported and not used');
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("fmt");
  });
});

describe("Database errors", () => {
  it("matches Prisma P2002 unique constraint", () => {
    const result = analyze(
      "PrismaClientKnownRequestError: Unique constraint failed P2002"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("Unique constraint");
  });

  it("matches MongoDB duplicate key", () => {
    const result = analyze(
      "MongoServerError: E11000 duplicate key error collection: db.users index: email_1"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("Duplicate key");
  });

  it("matches PostgreSQL relation not found", () => {
    const result = analyze(
      'error: relation "users" does not exist'
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("users");
  });
});

describe("Misc errors", () => {
  it("matches JWT expired", () => {
    const result = analyze("TokenExpiredError: jwt expired");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("expired");
  });

  it("matches out of memory", () => {
    const result = analyze(
      "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].category).toBe("memory");
  });

  it("matches git merge conflict", () => {
    const result = analyze("CONFLICT (content): Merge conflict in src/app.ts");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("conflict");
  });

  it("matches SSH permission denied", () => {
    const result = analyze("Permission denied (publickey).");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("SSH");
  });

  it("matches Docker daemon not running", () => {
    const result = analyze(
      "Cannot connect to the Docker daemon at unix:///var/run/docker.sock"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("Docker");
  });
});

describe("Build tool errors", () => {
  it("matches webpack module not found", () => {
    const result = analyze(
      "Module not found: Error: Can't resolve 'lodash' in webpack"
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("lodash");
  });

  it("matches Vite failed import", () => {
    const result = analyze(
      '[vite] Internal server error: Failed to resolve import "missing-pkg"'
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("missing-pkg");
  });
});

describe("Next.js errors", () => {
  it("matches server component hook error", () => {
    const result = analyze(
      "You're importing a component that needs useState. It only works in a Client Component but none of its parents are marked with \"use client\", so they're Server Components by default."
    );
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].explanation).toContain("Server Component");
  });
});
