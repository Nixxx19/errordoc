import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const npmEresolve: Matcher = {
  id: "npm-eresolve",
  name: "npm ERESOLVE",
  frameworks: ["node"],
  test: (input) => /ERESOLVE|peer dep.*conflict|Could not resolve dependency/i.test(input),
  match(input) {
    const pkg = extractGroup(input, /(?:While resolving|peer dep.*of)\s+(\S+@\S+)/i);
    const conflictPkg = extractGroup(input, /(?:Conflicting peer dependency|Could not resolve dependency).*?(\S+@\S+)/i);

    return {
      id: this.id,
      pattern: "ERESOLVE: peer dependency conflict",
      explanation: `npm can't resolve the dependency tree${pkg ? ` for ${pkg}` : ""}${conflictPkg ? ` — conflicts with ${conflictPkg}` : ""}. Two packages require incompatible versions of the same dependency.`,
      fixes: [
        { description: "Install with --legacy-peer-deps to skip strict peer dep checks", command: "npm install --legacy-peer-deps", safe: true },
        { description: "Install with --force to accept an incorrect dependency tree", command: "npm install --force", safe: false },
        { description: "Check which package versions are compatible and pin them", safe: false },
        { description: "Add an overrides field in package.json to force a specific version", safe: false },
      ],
      confidence: 0.95,
      category: "dependency",
      matched: input.match(/ERESOLVE|peer dep.*conflict|Could not resolve dependency/i)![0],
    };
  },
};

export const npmEacces: Matcher = {
  id: "npm-eacces",
  name: "npm EACCES",
  frameworks: ["node"],
  test: (input) => /npm.*EACCES|EACCES.*npm/i.test(input),
  match(input) {
    const path = extractGroup(input, /EACCES[:\s]+(?:permission denied[,\s]+)?(?:access\s+)?'([^']+)'/);

    return {
      id: this.id,
      pattern: "npm EACCES: permissions error",
      explanation: `npm doesn't have permission to access ${path ? `"${path}"` : "the required directory"}. This usually happens when npm was installed or run as root previously.`,
      fixes: [
        { description: "Fix npm permissions by setting a user-owned prefix", command: "npm config set prefix ~/.npm-global && export PATH=~/.npm-global/bin:$PATH", safe: true },
        { description: "Use nvm (Node Version Manager) instead of system Node", command: "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash", safe: false },
        { description: "Fix ownership of the npm directories", command: "sudo chown -R $(whoami) ~/.npm", safe: false },
        { description: "DO NOT use sudo with npm install — it creates permission issues", safe: false },
      ],
      confidence: 0.93,
      category: "permission",
      matched: input.match(/npm.*EACCES|EACCES.*npm/i)![0],
    };
  },
};

export const npmCbNeverCalled: Matcher = {
  id: "npm-cb-never-called",
  name: "npm cb() never called",
  frameworks: ["node"],
  test: (input) => /cb\(\) never called/.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "npm ERR! cb() never called",
      explanation: "An internal npm error — a callback was never invoked, usually due to a corrupted cache or network interruption.",
      fixes: [
        { description: "Clear the npm cache", command: "npm cache clean --force", safe: true },
        { description: "Delete node_modules and reinstall", command: "rm -rf node_modules package-lock.json && npm install", safe: true },
        { description: "Update npm to the latest version", command: "npm install -g npm@latest", safe: true },
        { description: "Check your network connection — partial downloads can cause this", safe: false },
      ],
      confidence: 0.92,
      category: "runtime",
      matched: "cb() never called",
    };
  },
};

export const npmEperm: Matcher = {
  id: "npm-eperm",
  name: "npm EPERM",
  frameworks: ["node"],
  test: (input) => /npm.*EPERM|EPERM.*npm|EPERM.*operation not permitted/i.test(input),
  match(input) {
    const path = extractGroup(input, /EPERM[:\s]+(?:operation not permitted[,\s]+)?(?:\w+\s+)?'([^']+)'/);

    return {
      id: this.id,
      pattern: "npm EPERM: operation not permitted",
      explanation: `The operation is not permitted${path ? ` for "${path}"` : ""}. On Windows, this often means a file is locked by another process.`,
      fixes: [
        { description: "Close any editors/IDEs that might be locking node_modules files", safe: false },
        { description: "Delete node_modules and reinstall", command: "rm -rf node_modules && npm install", safe: true },
        { description: "On Windows, close all terminals and try again", safe: false },
        { description: "Disable antivirus temporarily — it can lock npm files during install", safe: false },
      ],
      confidence: 0.91,
      category: "permission",
      matched: input.match(/EPERM.*operation not permitted|npm.*EPERM/i)![0],
    };
  },
};

export const npmDeprecated: Matcher = {
  id: "npm-deprecated",
  name: "npm deprecated warning",
  frameworks: ["node"],
  test: (input) => /npm WARN deprecated\s+\S+/.test(input),
  match(input) {
    const pkg = extractGroup(input, /npm WARN deprecated\s+(\S+@\S+)/);
    const reason = extractGroup(input, /npm WARN deprecated\s+\S+:\s+(.+)/);

    return {
      id: this.id,
      pattern: "npm WARN deprecated",
      explanation: `The package ${pkg ?? "a dependency"} is deprecated${reason ? `: ${reason}` : ""}. It may have security vulnerabilities or an unmaintained codebase.`,
      fixes: [
        { description: "Check for an alternative/replacement package in the deprecation message", safe: false },
        { description: "Run a security audit", command: "npm audit", safe: true },
        { description: "Update the deprecated package to its latest version (if it exists)", command: pkg ? `npm install ${pkg.split("@")[0]}@latest` : undefined, safe: false },
        { description: "If it's a transitive dependency, update the parent package that depends on it", safe: false },
      ],
      confidence: 0.8,
      category: "dependency",
      matched: input.match(/npm WARN deprecated\s+\S+/)![0],
    };
  },
};

export const npmE404: Matcher = {
  id: "npm-e404",
  name: "npm E404 Package Not Found",
  frameworks: ["node"],
  test: (input) => /npm ERR!.*(?:code E404|404 Not Found)|ERR! 404.*(?:is not in this registry|Not found)/i.test(input),
  match(input) {
    const pkg = extractGroup(input, /404.*['"]?(\S+?)['"]?\s+is not in/i) ??
      extractGroup(input, /Not found.*['"]?(\S+?)['"]?/i);

    return {
      id: this.id,
      pattern: "npm E404: package not found",
      explanation: `The package ${pkg ? `"${pkg}" ` : ""}was not found in the npm registry. It may be a typo, a private package, or it was unpublished.`,
      fixes: [
        { description: "Check for typos in the package name", safe: false },
        { description: "Search npm for the correct package name", command: pkg ? `npm search ${pkg}` : undefined, safe: true },
        { description: "If it's a scoped private package, make sure you're logged in", command: "npm login", safe: false },
        { description: "Check your .npmrc for the correct registry URL", safe: false },
      ],
      confidence: 0.94,
      category: "dependency",
      matched: input.match(/npm ERR!.*(?:code E404|404 Not Found)|ERR! 404/i)![0],
    };
  },
};

export const npmEtarget: Matcher = {
  id: "npm-etarget",
  name: "npm ETARGET",
  frameworks: ["node"],
  test: (input) => /ETARGET|No matching version found/i.test(input),
  match(input) {
    const pkg = extractGroup(input, /(?:ETARGET|No matching version found for)\s+(\S+@\S+)/i);

    return {
      id: this.id,
      pattern: "npm ETARGET: no matching version",
      explanation: `No version of ${pkg ? `"${pkg}" ` : "the package "}matches the requested range. The version might not exist or the semver range is too restrictive.`,
      fixes: [
        { description: "Check available versions of the package", command: pkg ? `npm view ${pkg.split("@")[0]} versions` : undefined, safe: true },
        { description: "Install the latest version", command: pkg ? `npm install ${pkg.split("@")[0]}@latest` : undefined, safe: false },
        { description: "Check package.json for overly strict version constraints", safe: false },
        { description: "If using a tag like @canary or @next, verify the tag exists", safe: false },
      ],
      confidence: 0.93,
      category: "dependency",
      matched: input.match(/ETARGET|No matching version found/i)![0],
    };
  },
};
