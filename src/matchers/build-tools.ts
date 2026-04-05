import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const webpackError: Matcher = {
  id: "webpack-error",
  name: "Webpack Error",
  frameworks: ["webpack"],
  test: (input) => /Module build failed|Module not found.*webpack|webpack.*error/i.test(input),
  match(input) {
    const moduleNotFound = extractGroup(input, /Module not found.*Can't resolve '([^']+)'/);
    const loaderFailed = extractGroup(input, /Module build failed.*?(\w+-loader)/);

    if (moduleNotFound) {
      return {
        id: this.id,
        pattern: "Webpack: Module not found",
        explanation: `Webpack can't resolve "${moduleNotFound}". The package isn't installed, the path is wrong, or a webpack alias is missing.`,
        fixes: [
          { description: `Install the package`, command: `npm install ${moduleNotFound}`, safe: true },
          { description: "Check webpack resolve.alias in webpack.config.js", safe: false },
          { description: "Check for missing file extensions in imports", safe: false },
        ],
        confidence: 0.9,
        category: "build",
        framework: "webpack",
        matched: `Module not found: Can't resolve '${moduleNotFound}'`,
      };
    }

    if (loaderFailed) {
      return {
        id: this.id,
        pattern: `Webpack: ${loaderFailed} failed`,
        explanation: `The ${loaderFailed} webpack loader failed to process a file. The loader is misconfigured, missing, or the source file has errors.`,
        fixes: [
          { description: `Install or reinstall the loader`, command: `npm install -D ${loaderFailed}`, safe: true },
          { description: "Check the loader configuration in webpack.config.js", safe: false },
          { description: "Check the source file for errors", safe: false },
        ],
        confidence: 0.85,
        category: "build",
        framework: "webpack",
        matched: `Module build failed: ${loaderFailed}`,
      };
    }

    return {
      id: this.id,
      pattern: "Webpack Error",
      explanation: "Webpack build error. Check the full error output above for details.",
      fixes: [
        { description: "Run webpack with --stats verbose for more details", safe: false },
        { description: "Clear the cache", command: "rm -rf node_modules/.cache", safe: true },
      ],
      confidence: 0.5,
      category: "build",
      framework: "webpack",
      matched: input.match(/webpack.*error|Module build failed/i)![0],
    };
  },
};

export const viteError: Matcher = {
  id: "vite-error",
  name: "Vite Error",
  frameworks: ["vite"],
  test: (input) => /\[vite\]|vite.*error|Failed to resolve import/i.test(input),
  match(input) {
    const failedImport = extractGroup(input, /Failed to resolve import "([^"]+)"/);
    const depOptimize = /Dependency optimization|optimized dependencies changed/.test(input);

    if (failedImport) {
      return {
        id: this.id,
        pattern: "Vite: Failed to resolve import",
        explanation: `Vite can't resolve import "${failedImport}". The package isn't installed or the path is wrong.`,
        fixes: [
          { description: `Install the package`, command: `npm install ${failedImport}`, safe: true },
          { description: "Check for typos in the import path", safe: false },
          { description: "Add the package to optimizeDeps.include in vite.config.ts", safe: false },
        ],
        confidence: 0.9,
        category: "build",
        framework: "vite",
        matched: `Failed to resolve import "${failedImport}"`,
      };
    }

    if (depOptimize) {
      return {
        id: this.id,
        pattern: "Vite: Dependency optimization",
        explanation: "Vite's dependency pre-bundling needs to be re-run. This happens when dependencies change.",
        fixes: [
          { description: "Restart the dev server", safe: false },
          { description: "Clear Vite cache", command: "rm -rf node_modules/.vite", safe: true },
          { description: "Force re-optimize", command: "npx vite --force", safe: true },
        ],
        confidence: 0.85,
        category: "build",
        framework: "vite",
        matched: "Dependency optimization",
      };
    }

    return {
      id: this.id,
      pattern: "Vite Error",
      explanation: "Vite encountered an error. Check the error message above.",
      fixes: [
        { description: "Restart the dev server", safe: false },
        { description: "Clear Vite cache", command: "rm -rf node_modules/.vite", safe: true },
      ],
      confidence: 0.5,
      category: "build",
      framework: "vite",
      matched: input.match(/\[vite\]|vite.*error/i)![0],
    };
  },
};

export const eslintError: Matcher = {
  id: "eslint-error",
  name: "ESLint Error",
  frameworks: ["eslint"],
  test: (input) => /eslint|Configuration for rule|Failed to load config/i.test(input),
  match(input) {
    const configFail = extractGroup(input, /Failed to load config "([^"]+)"/);
    const ruleFail = extractGroup(input, /Configuration for rule "([^"]+)"/);

    if (configFail) {
      return {
        id: this.id,
        pattern: "ESLint: Failed to load config",
        explanation: `ESLint can't find the config "${configFail}". The shareable config isn't installed.`,
        fixes: [
          { description: `Install the config`, command: `npm install -D eslint-config-${configFail}`, safe: true },
          { description: "Check your .eslintrc extends field", safe: false },
        ],
        confidence: 0.9,
        category: "config",
        framework: "eslint",
        matched: `Failed to load config "${configFail}"`,
      };
    }

    if (ruleFail) {
      return {
        id: this.id,
        pattern: "ESLint: Invalid rule config",
        explanation: `ESLint rule "${ruleFail}" is misconfigured. The rule options don't match the expected schema.`,
        fixes: [
          { description: `Check the documentation for "${ruleFail}" rule`, safe: false },
          { description: "Disable the rule temporarily to unblock", safe: false },
        ],
        confidence: 0.85,
        category: "config",
        framework: "eslint",
        matched: `Configuration for rule "${ruleFail}"`,
      };
    }

    return {
      id: this.id,
      pattern: "ESLint Error",
      explanation: "ESLint configuration error.",
      fixes: [
        { description: "Check your ESLint configuration", safe: false },
        { description: "Run: npx eslint --debug for verbose output", command: "npx eslint --debug", safe: true },
      ],
      confidence: 0.5,
      category: "config",
      framework: "eslint",
      matched: input.match(/eslint.*error|Failed to load/i)![0],
    };
  },
};

export const dockerError: Matcher = {
  id: "docker-error",
  name: "Docker Error",
  frameworks: ["docker"],
  test: (input) => /docker|Cannot connect to the Docker daemon|port is already allocated|no space left on device/i.test(input),
  match(input) {
    const daemonDown = /Cannot connect to the Docker daemon/.test(input);
    const portAllocated = extractGroup(input, /port is already allocated.*?(\d+)/i) ?? extractGroup(input, /Bind for.*:(\d+) failed/);
    const noSpace = /no space left on device/.test(input);
    const imageNotFound = extractGroup(input, /(?:manifest|image).*"?([^"\s]+)"? not found/i);

    if (daemonDown) {
      return {
        id: this.id, pattern: "Docker: daemon not running",
        explanation: "Docker daemon isn't running. Docker Desktop might not be started.",
        fixes: [
          { description: "Start Docker Desktop", safe: false },
          { description: "On Linux, start the daemon", command: "sudo systemctl start docker", safe: false },
          { description: "Check Docker status", command: "docker info", safe: true },
        ],
        confidence: 0.95, category: "environment", framework: "docker",
        matched: "Cannot connect to the Docker daemon",
      };
    }

    if (portAllocated) {
      return {
        id: this.id, pattern: "Docker: port already allocated",
        explanation: `Port ${portAllocated} is already in use by another container or process.`,
        fixes: [
          { description: "Stop the container using the port", command: `docker ps | grep ${portAllocated}`, safe: true },
          { description: "Map to a different host port: -p NEWPORT:CONTAINERPORT", safe: false },
          { description: "Kill the process using the port", command: `lsof -i :${portAllocated}`, safe: true },
        ],
        confidence: 0.92, category: "network", framework: "docker",
        matched: `port ${portAllocated} is already allocated`,
      };
    }

    if (noSpace) {
      return {
        id: this.id, pattern: "Docker: no space left",
        explanation: "Docker has run out of disk space. Old images, containers, and volumes are filling up the disk.",
        fixes: [
          { description: "Remove unused Docker data", command: "docker system prune -a", safe: false },
          { description: "Remove dangling images", command: "docker image prune", safe: true },
          { description: "Check disk usage", command: "docker system df", safe: true },
        ],
        confidence: 0.93, category: "environment", framework: "docker",
        matched: "no space left on device",
      };
    }

    if (imageNotFound) {
      return {
        id: this.id, pattern: "Docker: image not found",
        explanation: `Docker image "${imageNotFound}" not found. It doesn't exist on Docker Hub, the name is wrong, or it's in a private registry.`,
        fixes: [
          { description: "Check the image name and tag for typos", safe: false },
          { description: "Search Docker Hub for the correct image name", safe: false },
          { description: "If private, login first", command: "docker login", safe: false },
        ],
        confidence: 0.9, category: "environment", framework: "docker",
        matched: `image "${imageNotFound}" not found`,
      };
    }

    return {
      id: this.id, pattern: "Docker Error",
      explanation: "Docker error.",
      fixes: [{ description: "Check Docker logs for details", command: "docker logs <container>", safe: true }],
      confidence: 0.4, category: "environment", framework: "docker",
      matched: input.match(/docker.*error/i)?.[0] ?? "Docker error",
    };
  },
};
