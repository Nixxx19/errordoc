import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const reactHookError: Matcher = {
  id: "react-hook-error",
  name: "React Hook Error",
  frameworks: ["react"],
  test: (input) =>
    /Invalid hook call|Hooks can only be called|rendered more hooks than/.test(input),
  match(input) {
    const moreHooks = /Rendered more hooks than during the previous render/.test(input);
    const invalidCall = /Invalid hook call/.test(input);

    if (moreHooks) {
      return {
        id: this.id,
        pattern: "React: More hooks than previous render",
        explanation: "A component rendered more hooks than last time. This happens when a hook is called inside a conditional, loop, or early return — hooks must be called in the exact same order every render.",
        fixes: [
          { description: "Move all hooks to the top of the component, before any returns or conditions", safe: false },
          { description: "Never call hooks inside if/else, loops, or after early returns", safe: false },
          { description: "Use the 'eslint-plugin-react-hooks' to catch this automatically", command: "npm install -D eslint-plugin-react-hooks", safe: true },
        ],
        confidence: 0.95,
        category: "runtime",
        framework: "react",
        matched: "Rendered more hooks than during the previous render",
      };
    }

    return {
      id: this.id,
      pattern: "React: Invalid hook call",
      explanation: "Hooks can only be called inside React function components or custom hooks. Common causes: (1) calling hooks in a class component, (2) calling hooks in a regular function, (3) having multiple copies of React in your bundle.",
      fixes: [
        { description: "Ensure hooks are only called in function components or custom hooks", safe: false },
        { description: "Check for duplicate React: npm ls react", command: "npm ls react", safe: true },
        { description: "Ensure React and react-dom versions match", safe: false },
        { description: "Don't call hooks in event handlers or callbacks — only at the top level", safe: false },
      ],
      confidence: 0.95,
      category: "runtime",
      framework: "react",
      matched: input.match(/Invalid hook call|Hooks can only be called/)![0],
      docsUrl: "https://react.dev/warnings/invalid-hook-call-warning",
    };
  },
};

export const reactKeyError: Matcher = {
  id: "react-key-warning",
  name: "React Key Warning",
  frameworks: ["react"],
  test: (input) =>
    /Each child in a list should have a unique "key" prop/.test(input),
  match() {
    return {
      id: this.id,
      pattern: "React: Missing key prop",
      explanation: "When rendering a list with .map(), each element needs a unique 'key' prop. React uses keys to efficiently track which items changed, were added, or removed.",
      fixes: [
        { description: "Add a unique 'key' prop: items.map(item => <Item key={item.id} />)", safe: false },
        { description: "Use a unique identifier from your data (id, slug, etc.) — NOT the array index", safe: false },
        { description: "Array index as key is okay ONLY for static lists that never reorder", safe: false },
      ],
      confidence: 0.95,
      category: "runtime",
      framework: "react",
      matched: 'Each child in a list should have a unique "key" prop',
      docsUrl: "https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key",
    };
  },
};

export const reactHydrationError: Matcher = {
  id: "react-hydration",
  name: "React Hydration Mismatch",
  frameworks: ["react", "nextjs"],
  test: (input) =>
    /Hydration failed|hydrat|server.*client.*mismatch|Text content does not match/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "React: Hydration Mismatch",
      explanation: "The server-rendered HTML doesn't match what React renders on the client. This breaks hydration. Common cause: using browser-only APIs (Date, window, Math.random) during server rendering.",
      fixes: [
        { description: "Wrap browser-only code in useEffect (runs only on client)", safe: false },
        { description: "Use 'suppressHydrationWarning' on elements with intentional mismatches", safe: false },
        { description: "Check for Date/time formatting that differs between server and client", safe: false },
        { description: "In Next.js, use 'use client' directive for client-only components", safe: false },
        { description: "Ensure no browser extensions are injecting HTML into the page", safe: false },
      ],
      confidence: 0.9,
      category: "runtime",
      framework: "react",
      matched: input.match(/Hydration failed|Text content does not match/)![0],
      docsUrl: "https://react.dev/errors/418",
    };
  },
};

export const reactMinifiedError: Matcher = {
  id: "react-minified",
  name: "React Minified Error",
  frameworks: ["react"],
  test: (input) => /Minified React error #\d+/.test(input),
  match(input) {
    const errorNum = extractGroup(input, /Minified React error #(\d+)/);
    const knownErrors: Record<string, string> = {
      "130": "Element type is invalid — check your imports (default vs named export)",
      "152": "Nothing was returned from render — a component must return JSX or null",
      "185": "Maximum update depth exceeded — infinite loop in useEffect or setState",
      "301": "Invalid hook call — hooks called outside a component",
      "418": "Hydration mismatch — server and client HTML don't match",
      "419": "Hydration mismatch — server rendered more content than client",
      "423": "There was an error during hydration that couldn't recover",
      "425": "Text content mismatch during hydration",
    };

    return {
      id: this.id,
      pattern: `React Minified Error #${errorNum}`,
      explanation: knownErrors[errorNum ?? ""] ?? `React production error #${errorNum}. Visit the docs URL for the full message.`,
      fixes: [
        { description: "Run in development mode to see the full error message", safe: false },
        { description: `Visit the React error decoder for details`, safe: false },
      ],
      confidence: 0.85,
      category: "runtime",
      framework: "react",
      matched: `Minified React error #${errorNum}`,
      docsUrl: `https://react.dev/errors/${errorNum}`,
    };
  },
};

export const reactMaxUpdateDepth: Matcher = {
  id: "react-max-update",
  name: "React Max Update Depth",
  frameworks: ["react"],
  test: (input) => /Maximum update depth exceeded/.test(input),
  match() {
    return {
      id: this.id,
      pattern: "React: Maximum update depth exceeded",
      explanation: "Infinite re-render loop. A component keeps calling setState, triggering a re-render, which calls setState again. Usually caused by calling setState directly in render or a useEffect without proper dependencies.",
      fixes: [
        { description: "Check useEffect dependencies — add the correct dependency array", safe: false },
        { description: "Don't call setState directly in the render body", safe: false },
        { description: "Use onClick={() => handler()} instead of onClick={handler()} (calling vs passing)", safe: false },
        { description: "Check for objects/arrays in useEffect deps that are recreated every render", safe: false },
      ],
      confidence: 0.95,
      category: "runtime",
      framework: "react",
      matched: "Maximum update depth exceeded",
      docsUrl: "https://react.dev/reference/react/useState#ive-updated-the-state-but-logging-gives-me-the-old-value",
    };
  },
};

export const reactInvalidElement: Matcher = {
  id: "react-invalid-element",
  name: "React Invalid Element",
  frameworks: ["react"],
  test: (input) =>
    /Element type is invalid|expected a string.*or a class\/function|Objects are not valid as a React child/.test(input),
  match(input) {
    const isObjectChild = /Objects are not valid as a React child/.test(input);

    if (isObjectChild) {
      return {
        id: this.id,
        pattern: "React: Objects are not valid as a React child",
        explanation: "You're trying to render a plain JavaScript object in JSX. React can render strings, numbers, and elements — but not objects or arrays of objects directly.",
        fixes: [
          { description: "Convert to string: JSON.stringify(obj) or obj.toString()", safe: false },
          { description: "Render a specific property: {obj.name} instead of {obj}", safe: false },
          { description: "If it's a Date, format it: {date.toLocaleDateString()}", safe: false },
          { description: "If it's a Promise, use Suspense or await it in a useEffect", safe: false },
        ],
        confidence: 0.92,
        category: "runtime",
        framework: "react",
        matched: "Objects are not valid as a React child",
      };
    }

    return {
      id: this.id,
      pattern: "React: Element type is invalid",
      explanation: "A component is undefined or not a valid React element. Usually a bad import — check default vs named exports.",
      fixes: [
        { description: "Check your import: import Component from '...' vs import { Component } from '...'", safe: false },
        { description: "Ensure the component file actually exports the component", safe: false },
        { description: "Check for circular imports between components", safe: false },
      ],
      confidence: 0.9,
      category: "runtime",
      framework: "react",
      matched: input.match(/Element type is invalid/)![0],
    };
  },
};
