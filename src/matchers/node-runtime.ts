import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";
import { findClosest } from "../utils/levenshtein.js";

export const referenceError: Matcher = {
  id: "node-reference-error",
  name: "ReferenceError",
  frameworks: ["node"],
  test: (input) => /ReferenceError:/.test(input),
  match(input) {
    const varName = extractGroup(input, /ReferenceError: (\w+) is not defined/);
    if (!varName) return null;

    const commonGlobals = [
      "require", "module", "exports", "__dirname", "__filename",
      "process", "Buffer", "console", "setTimeout", "setInterval",
      "Promise", "fetch", "URL", "URLSearchParams", "AbortController",
      "window", "document", "localStorage", "sessionStorage",
      "navigator", "alert", "confirm",
    ];
    const suggestion = findClosest(varName, commonGlobals);

    const isBrowserInNode = ["window", "document", "localStorage", "alert", "navigator"].includes(varName);
    const isNodeInBrowser = ["require", "__dirname", "__filename", "process", "Buffer"].includes(varName);

    let explanation: string;
    if (isBrowserInNode) {
      explanation = `"${varName}" is a browser API and doesn't exist in Node.js. You're running browser code in a Node.js environment.`;
    } else if (isNodeInBrowser) {
      explanation = `"${varName}" is a Node.js API and doesn't exist in the browser. You're running server code in a browser environment.`;
    } else {
      explanation = `"${varName}" is not defined. It hasn't been declared, is misspelled, or is out of scope.`;
    }

    return {
      id: this.id,
      pattern: "ReferenceError",
      explanation,
      fixes: [
        ...(suggestion && suggestion.toLowerCase() !== varName.toLowerCase()
          ? [{ description: `Did you mean "${suggestion}"?`, safe: false }]
          : []),
        ...(isBrowserInNode
          ? [{ description: "Use a library like jsdom if you need browser APIs in Node.js", command: "npm install jsdom", safe: true }]
          : []),
        ...(isNodeInBrowser
          ? [{ description: "Use a bundler (webpack/vite) that provides Node.js polyfills", safe: false }]
          : []),
        { description: `Check that "${varName}" is declared and in scope`, safe: false },
        { description: "Check for typos in the variable name", safe: false },
      ],
      confidence: 0.9,
      category: "runtime",
      matched: `ReferenceError: ${varName} is not defined`,
    };
  },
};

export const typeError: Matcher = {
  id: "node-type-error",
  name: "TypeError",
  frameworks: ["node"],
  test: (input) => /TypeError:/.test(input),
  match(input) {
    const notFunction = extractGroup(input, /TypeError: (\S+) is not a function/);
    const notIterable = extractGroup(input, /TypeError: (\S+) is not iterable/);
    const cannotRead = extractGroup(input, /TypeError: Cannot read propert(?:y|ies) of (null|undefined)/);
    const propName = extractGroup(input, /reading '([^']+)'/);
    const cannotSet = extractGroup(input, /TypeError: Cannot set propert(?:y|ies) of (null|undefined)/);
    const assignProp = extractGroup(input, /TypeError: Assignment to constant variable/);

    if (notFunction) {
      return {
        id: this.id,
        pattern: "TypeError: not a function",
        explanation: `"${notFunction}" is not a function. The value exists but it's not callable — it might be undefined, a string, an object, or you're calling the wrong property.`,
        fixes: [
          { description: `Check that "${notFunction}" is actually a function before calling it`, safe: false },
          { description: "Check for typos in the function name", safe: false },
          { description: "Ensure the module is imported correctly (default vs named export)", safe: false },
        ],
        confidence: 0.9,
        category: "type",
        matched: `TypeError: ${notFunction} is not a function`,
      };
    }

    if (cannotRead) {
      return {
        id: this.id,
        pattern: "TypeError: Cannot read properties",
        explanation: `You're trying to access "${propName ?? "a property"}" on ${cannotRead}. The object doesn't exist when you try to use it — it's ${cannotRead}.`,
        fixes: [
          { description: `Add a null check: obj?.${propName ?? "prop"} (optional chaining)`, safe: false },
          { description: "Verify the variable is initialized before accessing it", safe: false },
          { description: "Check if an API call returned null/undefined instead of data", safe: false },
        ],
        confidence: 0.92,
        category: "type",
        matched: input.match(/TypeError: Cannot read propert(?:y|ies) of (?:null|undefined)/)![0],
      };
    }

    if (cannotSet) {
      return {
        id: this.id,
        pattern: "TypeError: Cannot set properties",
        explanation: `You're trying to set a property on ${cannotSet}. The object doesn't exist yet.`,
        fixes: [
          { description: "Initialize the object before setting properties on it", safe: false },
          { description: "Add a null check before assignment", safe: false },
        ],
        confidence: 0.9,
        category: "type",
        matched: input.match(/TypeError: Cannot set propert(?:y|ies) of (?:null|undefined)/)![0],
      };
    }

    if (notIterable) {
      return {
        id: this.id,
        pattern: "TypeError: not iterable",
        explanation: `"${notIterable}" is not iterable. You're trying to use for...of, spread, or destructuring on something that isn't an array or iterable object.`,
        fixes: [
          { description: `Check that "${notIterable}" is an array or iterable`, safe: false },
          { description: "Wrap in Array.from() if it's array-like", safe: false },
          { description: "Use Object.entries() or Object.keys() for objects", safe: false },
        ],
        confidence: 0.9,
        category: "type",
        matched: `TypeError: ${notIterable} is not iterable`,
      };
    }

    if (assignProp) {
      return {
        id: this.id,
        pattern: "TypeError: Assignment to constant",
        explanation: "You're trying to reassign a variable declared with 'const'. Constants can't be reassigned after declaration.",
        fixes: [
          { description: "Change 'const' to 'let' if the variable needs to be reassigned", safe: false },
          { description: "Create a new variable instead of reassigning", safe: false },
        ],
        confidence: 0.95,
        category: "type",
        matched: "TypeError: Assignment to constant variable",
      };
    }

    // Generic TypeError
    const msg = extractGroup(input, /TypeError: (.+)/);
    return {
      id: this.id,
      pattern: "TypeError",
      explanation: `Type error: ${msg ?? "an operation was performed on an incompatible type"}.`,
      fixes: [
        { description: "Check the types of all values in the expression", safe: false },
        { description: "Use typeof/instanceof to verify types at runtime", safe: false },
      ],
      confidence: 0.6,
      category: "type",
      matched: input.match(/TypeError: .+/)![0],
    };
  },
};

export const syntaxError: Matcher = {
  id: "node-syntax-error",
  name: "SyntaxError",
  frameworks: ["node"],
  test: (input) => /SyntaxError:/.test(input),
  match(input) {
    const unexpectedToken = extractGroup(input, /SyntaxError: Unexpected token '?(.+?)'?$/m);
    const jsonParse = /SyntaxError: (?:Unexpected token .* in JSON|Expected property name|JSON\.parse)/.test(input);
    const importOutside = /SyntaxError: Cannot use import statement outside a module/.test(input);
    const awaitOutside = /SyntaxError: await is only valid in async function/.test(input);
    const missingParen = /SyntaxError: missing \)/.test(input);

    if (importOutside) {
      return {
        id: this.id,
        pattern: "SyntaxError: import outside module",
        explanation: "You're using ES Module import syntax in a CommonJS file. Node.js defaults to CommonJS unless told otherwise.",
        fixes: [
          { description: 'Add "type": "module" to package.json', safe: false },
          { description: "Rename the file to .mjs extension", safe: false },
          { description: "Use require() instead of import", safe: false },
          { description: "If using TypeScript, set \"module\": \"commonjs\" in tsconfig.json", safe: false },
        ],
        confidence: 0.97,
        category: "syntax",
        matched: "SyntaxError: Cannot use import statement outside a module",
      };
    }

    if (awaitOutside) {
      return {
        id: this.id,
        pattern: "SyntaxError: await outside async",
        explanation: "You're using 'await' outside an async function. 'await' can only be used inside functions marked as 'async' (or at the top level of an ES module).",
        fixes: [
          { description: "Wrap the code in an async function: async function main() { ... }", safe: false },
          { description: "Use .then() instead of await", safe: false },
          { description: 'Enable top-level await by adding "type": "module" to package.json', safe: false },
        ],
        confidence: 0.95,
        category: "syntax",
        matched: "SyntaxError: await is only valid in async function",
      };
    }

    if (jsonParse) {
      return {
        id: this.id,
        pattern: "SyntaxError: JSON parse",
        explanation: "JSON.parse() received invalid JSON. The input is malformed — possibly HTML (API returned an error page), has trailing commas, or contains comments.",
        fixes: [
          { description: "Check the raw string being parsed (log it before JSON.parse)", safe: false },
          { description: "If fetching from an API, check the response status before parsing", safe: false },
          { description: "Validate JSON at jsonlint.com", safe: false },
          { description: "Check for trailing commas or single quotes (JSON requires double quotes)", safe: false },
        ],
        confidence: 0.93,
        category: "syntax",
        matched: input.match(/SyntaxError: (?:Unexpected token|Expected property name|JSON\.parse)[^\n]*/)![0],
      };
    }

    return {
      id: this.id,
      pattern: "SyntaxError",
      explanation: `Syntax error${unexpectedToken ? `: unexpected "${unexpectedToken}"` : ""}. The JavaScript parser hit something it didn't expect — usually a missing bracket, parenthesis, or semicolon.`,
      fixes: [
        { description: "Check for mismatched brackets, braces, or parentheses", safe: false },
        ...(missingParen ? [{ description: "You're missing a closing parenthesis ')'", safe: false }] : []),
        { description: "Look at the line number in the stack trace — the error is usually on that line or the line before", safe: false },
      ],
      confidence: 0.7,
      category: "syntax",
      matched: input.match(/SyntaxError: .+/)![0],
    };
  },
};

export const rangeError: Matcher = {
  id: "node-range-error",
  name: "RangeError",
  frameworks: ["node"],
  test: (input) => /RangeError:/.test(input),
  match(input) {
    const stackOverflow = /Maximum call stack size exceeded/.test(input);
    const invalidArrayLength = /Invalid array length/.test(input);

    if (stackOverflow) {
      return {
        id: this.id,
        pattern: "RangeError: stack overflow",
        explanation: "Infinite recursion detected. A function calls itself (directly or indirectly) without ever stopping, until the call stack runs out of space.",
        fixes: [
          { description: "Add or fix the base case in your recursive function", safe: false },
          { description: "Check for circular references in objects being processed", safe: false },
          { description: "Convert recursion to iteration using a stack/queue", safe: false },
          { description: "Check React: circular state updates or infinite useEffect loops", safe: false },
        ],
        confidence: 0.95,
        category: "runtime",
        matched: "RangeError: Maximum call stack size exceeded",
      };
    }

    if (invalidArrayLength) {
      return {
        id: this.id,
        pattern: "RangeError: Invalid array length",
        explanation: "You tried to create an array with an invalid length (negative number, non-integer, or too large).",
        fixes: [
          { description: "Ensure array length is a non-negative integer", safe: false },
          { description: "Check for NaN or Infinity values being used as array sizes", safe: false },
        ],
        confidence: 0.9,
        category: "runtime",
        matched: "RangeError: Invalid array length",
      };
    }

    return {
      id: this.id,
      pattern: "RangeError",
      explanation: "A value is outside the allowed range.",
      fixes: [
        { description: "Check numeric values for NaN, Infinity, or negative numbers", safe: false },
      ],
      confidence: 0.6,
      category: "runtime",
      matched: input.match(/RangeError: .+/)![0],
    };
  },
};
