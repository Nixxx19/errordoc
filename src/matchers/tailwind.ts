import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const tailwindModuleNotFound: Matcher = {
  id: "tailwind-module-not-found",
  name: "Tailwind Module Not Found",
  frameworks: ["node"],
  test: (input) => /Cannot find module ['"]tailwindcss['"]|Cannot find module ['"]@tailwindcss/i.test(input),
  match(input) {
    const mod = extractGroup(input, /Cannot find module ['"](@?tailwindcss\S*)['"]/) ?? "tailwindcss";

    return {
      id: this.id,
      pattern: "Cannot find module 'tailwindcss'",
      explanation: `The module "${mod}" is not installed. Tailwind CSS is a devDependency that needs to be installed explicitly.`,
      fixes: [
        { description: "Install Tailwind CSS and its peer dependencies", command: "npm install -D tailwindcss postcss autoprefixer", safe: true },
        { description: "Initialize the Tailwind config", command: "npx tailwindcss init -p", safe: true },
        { description: "If already installed, try deleting node_modules and reinstalling", command: "rm -rf node_modules && npm install", safe: true },
      ],
      confidence: 0.95,
      category: "module",
      matched: input.match(/Cannot find module ['"](?:@?tailwindcss\S*)['"]/)![0],
    };
  },
};

export const postcssPluginError: Matcher = {
  id: "tailwind-postcss-plugin-error",
  name: "PostCSS Plugin Error",
  frameworks: ["node"],
  test: (input) => /PostCSS plugin.*(?:error|failed|requires)|Error: PostCSS plugin/i.test(input),
  match(input) {
    const plugin = extractGroup(input, /PostCSS plugin\s+["']?(\S+?)["']?\s+/i);

    return {
      id: this.id,
      pattern: "PostCSS Plugin Error",
      explanation: `A PostCSS plugin${plugin ? ` ("${plugin}")` : ""} failed. This often happens with version mismatches between PostCSS, Tailwind, and Autoprefixer.`,
      fixes: [
        { description: "Reinstall PostCSS and its plugins with compatible versions", command: "npm install -D postcss tailwindcss autoprefixer", safe: true },
        { description: "Check postcss.config.js for misconfigured plugins", safe: false },
        { description: "Make sure your PostCSS config uses the right format (CommonJS vs ESM)", safe: false },
        { description: "If using Tailwind v4, update your PostCSS config — the plugin API changed", safe: false },
      ],
      confidence: 0.88,
      category: "build",
      matched: input.match(/PostCSS plugin.*(?:error|failed|requires)|Error: PostCSS plugin/i)![0],
    };
  },
};

export const tailwindUnknownAtRule: Matcher = {
  id: "tailwind-unknown-at-rule",
  name: "Unknown at rule @tailwind",
  frameworks: ["node"],
  test: (input) => /Unknown at rule @(?:tailwind|apply|layer|config)/i.test(input),
  match(input) {
    const rule = extractGroup(input, /Unknown at rule (@\w+)/i);

    return {
      id: this.id,
      pattern: `Unknown at rule ${rule ?? "@tailwind"}`,
      explanation: `Your CSS linter or IDE doesn't recognize the ${rule ?? "@tailwind"} directive. This is a Tailwind CSS directive, not standard CSS, so linters flag it as unknown.`,
      fixes: [
        { description: "Install the Tailwind CSS IntelliSense VS Code extension for proper syntax highlighting", safe: false },
        { description: "Add /* stylelint-disable */ comments to suppress the warning", safe: false },
        { description: "Configure stylelint to ignore Tailwind directives: add 'at-rule-no-unknown' with ignoreAtRules", safe: false },
        { description: "If using VS Code, add to settings.json: \"css.lint.unknownAtRules\": \"ignore\"", safe: false },
      ],
      confidence: 0.92,
      category: "config",
      matched: input.match(/Unknown at rule @(?:tailwind|apply|layer|config)/i)![0],
    };
  },
};

export const tailwindApplyError: Matcher = {
  id: "tailwind-apply-error",
  name: "Tailwind @apply Error",
  frameworks: ["node"],
  test: (input) => /@apply.*not.*(?:found|exist|work)|cannot apply|The `@apply` directive/i.test(input),
  match(input) {
    const className = extractGroup(input, /@apply\s+["']?(\S+?)["']?\s/i) ??
      extractGroup(input, /class ["']?(\S+?)["']? (?:not found|does not exist)/i);

    return {
      id: this.id,
      pattern: "Tailwind @apply error",
      explanation: `The @apply directive failed${className ? ` for class "${className}"` : ""}. The Tailwind class doesn't exist or isn't available in the current context.`,
      fixes: [
        { description: "Check that the class name is a valid Tailwind utility (no typos)", safe: false },
        { description: "If using a custom class, make sure it's defined in your Tailwind config", safe: false },
        { description: "In Tailwind v3+, @apply with component classes requires the class to be in the same @layer", safe: false },
        { description: "Move the @apply usage to a CSS file that's processed by Tailwind's PostCSS plugin", safe: false },
      ],
      confidence: 0.9,
      category: "build",
      matched: input.match(/@apply.*not.*(?:found|exist|work)|cannot apply|The `@apply` directive/i)![0],
    };
  },
};
