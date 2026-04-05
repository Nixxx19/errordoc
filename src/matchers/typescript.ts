import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const tsTypeError: Matcher = {
  id: "ts-type-error",
  name: "TypeScript Type Error",
  frameworks: ["typescript"],
  test: (input) => /TS\d{4}:|error TS/.test(input),
  match(input) {
    const code = extractGroup(input, /TS(\d{4})/);
    const message = extractGroup(input, /error TS\d{4}: (.+)/);
    const file = extractGroup(input, /([^\s]+\.tsx?)\(\d+,\d+\)/);

    if (!code) return null;

    const tsErrors: Record<string, { explanation: string; fixes: string[] }> = {
      "2307": {
        explanation: "Cannot find module or its type declarations. The import path is wrong, the package isn't installed, or it's missing type definitions.",
        fixes: [
          "Install the package: npm install <package>",
          "Install type definitions: npm install -D @types/<package>",
          "Create a declaration file: declare module '<package>'",
          "Check tsconfig.json paths and baseUrl settings",
        ],
      },
      "2345": {
        explanation: "Argument type mismatch. You're passing a value of the wrong type to a function.",
        fixes: [
          "Check the function signature and match the expected types",
          "Use type assertion if you're sure: value as ExpectedType",
          "Add a type guard to narrow the type",
        ],
      },
      "2322": {
        explanation: "Type assignment mismatch. The value you're assigning doesn't match the declared type of the variable.",
        fixes: [
          "Fix the value to match the expected type",
          "Update the type declaration to accept the value",
          "Use a union type if multiple types are valid",
        ],
      },
      "2339": {
        explanation: "Property doesn't exist on the type. You're accessing a property that TypeScript doesn't know about.",
        fixes: [
          "Check for typos in the property name",
          "Add the property to the type/interface definition",
          "Use optional chaining: obj?.prop",
          "If from an API, update your type definition to match the actual response",
        ],
      },
      "2304": {
        explanation: "Cannot find name. The variable, function, or type is not in scope.",
        fixes: [
          "Import it: import { Name } from 'module'",
          "Declare it if it's a global: declare const Name: Type",
          "Check for typos",
        ],
      },
      "2532": {
        explanation: "Object is possibly undefined. TypeScript's strict null checks caught a potential null/undefined access.",
        fixes: [
          "Add a null check: if (obj) { obj.prop }",
          "Use optional chaining: obj?.prop",
          "Use non-null assertion if you're sure: obj!.prop (not recommended)",
        ],
      },
      "2531": {
        explanation: "Object is possibly null. TypeScript's strict null checks caught a potential null access.",
        fixes: [
          "Add a null check before accessing",
          "Use optional chaining: obj?.method()",
          "Use nullish coalescing: value ?? defaultValue",
        ],
      },
      "2769": {
        explanation: "No overload matches this call. The function exists but none of its signatures match the arguments you're passing.",
        fixes: [
          "Check the function's type signatures and match one exactly",
          "You might be passing extra arguments or wrong types",
          "In React: check that your component props match the expected types",
        ],
      },
      "2741": {
        explanation: "Property is missing in type. You're creating an object that's missing required properties.",
        fixes: [
          "Add the missing properties to the object",
          "Make the property optional with ?: in the interface",
          "Use Partial<Type> if all properties should be optional",
        ],
      },
      "7006": {
        explanation: "Parameter implicitly has an 'any' type. TypeScript's noImplicitAny is enabled and needs a type annotation.",
        fixes: [
          "Add a type annotation to the parameter: (param: Type) => ...",
          "If you don't know the type, use 'unknown' and narrow it",
          "Set noImplicitAny: false in tsconfig.json (not recommended)",
        ],
      },
      "18046": {
        explanation: "'value' is of type 'unknown'. You need to narrow the type before using it.",
        fixes: [
          "Use a type guard: if (typeof value === 'string') { ... }",
          "Use instanceof: if (value instanceof Error) { ... }",
          "Use a custom type guard function",
        ],
      },
      "1005": {
        explanation: "Expected a specific token (like ';', ')', '}') but got something else. Usually a syntax issue.",
        fixes: [
          "Check for missing semicolons, brackets, or parentheses",
          "Check the line above — the error often cascades from an earlier issue",
        ],
      },
      "1128": {
        explanation: "Declaration or statement expected. Usually means invalid syntax at the top level of a file.",
        fixes: [
          "Check for stray characters or invalid top-level expressions",
          "Ensure you're not mixing TypeScript and JavaScript syntax incorrectly",
        ],
      },
      "2694": {
        explanation: "Namespace has no exported member. You're importing something that doesn't exist in the module.",
        fixes: [
          "Check the module's exports — the name might have changed",
          "Update the package and its type definitions",
          "Check for version mismatches between the package and @types",
        ],
      },
      "2305": {
        explanation: "Module has no exported member. The named export doesn't exist — it might be a default export or was renamed.",
        fixes: [
          "Check if it's a default export: import Name from 'module'",
          "Check the module's actual exports",
          "The API may have changed — check the changelog",
        ],
      },
    };

    const known = code ? tsErrors[code] : undefined;

    return {
      id: this.id,
      pattern: `TS${code}`,
      explanation: known?.explanation ?? `TypeScript error TS${code}: ${message ?? "unknown error"}`,
      fixes: (known?.fixes ?? [message ?? "Check the TypeScript documentation"]).map((f) => ({
        description: f,
        safe: false,
      })),
      confidence: known ? 0.92 : 0.6,
      category: "type",
      framework: "typescript",
      matched: input.match(/error TS\d{4}: .+/)![0],
      docsUrl: `https://typescript.tv/errors/#TS${code}`,
    };
  },
};
