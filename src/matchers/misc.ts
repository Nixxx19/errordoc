import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const envVarMissing: Matcher = {
  id: "env-missing",
  name: "Missing Environment Variable",
  frameworks: ["node", "python"],
  test: (input) => /env.*undefined|missing.*env|NEXT_PUBLIC_|process\.env\.\w+ is undefined|environment variable/i.test(input),
  match(input) {
    const varName = extractGroup(input, /(?:process\.env\.(\w+)|env(?:ironment variable)?\s+['"]*(\w+))/) ??
      extractGroup(input, /(\w+) is undefined.*env/i);

    return {
      id: this.id,
      pattern: "Missing environment variable",
      explanation: `Environment variable${varName ? ` "${varName}"` : ""} is not set. It's missing from your .env file or system environment.`,
      fixes: [
        { description: "Add it to your .env file", safe: false },
        { description: "Check .env.example for required variables", safe: false },
        { description: "In Next.js, client-side env vars must start with NEXT_PUBLIC_", safe: false },
        { description: "Restart your dev server after changing .env", safe: false },
      ],
      confidence: 0.8,
      category: "environment",
      matched: input.match(/env.*undefined|missing.*env|environment variable/i)![0],
    };
  },
};

export const jwtError: Matcher = {
  id: "jwt-error",
  name: "JWT Error",
  frameworks: ["node"],
  test: (input) => /jwt|JsonWebTokenError|TokenExpiredError|invalid signature/.test(input),
  match(input) {
    const expired = /TokenExpiredError|jwt expired/.test(input);
    const malformed = /jwt malformed/.test(input);
    const invalidSig = /invalid signature/.test(input);

    if (expired) {
      return {
        id: this.id, pattern: "JWT: Token Expired",
        explanation: "The JWT token has expired. The user needs to log in again or the token needs to be refreshed.",
        fixes: [
          { description: "Implement token refresh flow (refresh tokens)", safe: false },
          { description: "Increase token expiry time", safe: false },
          { description: "Clear the expired token and redirect to login", safe: false },
        ],
        confidence: 0.95, category: "auth",
        matched: "TokenExpiredError: jwt expired",
      };
    }

    if (malformed) {
      return {
        id: this.id, pattern: "JWT: Malformed",
        explanation: "The JWT token is malformed — it's not a valid JWT string. Might be missing, truncated, or corrupted.",
        fixes: [
          { description: "Check the Authorization header format: 'Bearer <token>'", safe: false },
          { description: "Don't include 'Bearer ' prefix when passing to jwt.verify()", safe: false },
          { description: "Log the token to inspect it (remove the log after debugging)", safe: false },
        ],
        confidence: 0.93, category: "auth",
        matched: "JsonWebTokenError: jwt malformed",
      };
    }

    if (invalidSig) {
      return {
        id: this.id, pattern: "JWT: Invalid Signature",
        explanation: "JWT signature verification failed. The token was signed with a different secret/key than what you're using to verify.",
        fixes: [
          { description: "Ensure the same JWT_SECRET is used for signing and verifying", safe: false },
          { description: "Check that the secret hasn't been rotated/changed", safe: false },
          { description: "Don't confuse base64-encoded and raw secrets", safe: false },
        ],
        confidence: 0.93, category: "auth",
        matched: "JsonWebTokenError: invalid signature",
      };
    }

    return {
      id: this.id, pattern: "JWT Error",
      explanation: "JWT authentication error.",
      fixes: [{ description: "Check the JWT token and secret configuration", safe: false }],
      confidence: 0.6, category: "auth",
      matched: input.match(/jwt|JsonWebTokenError/)![0],
    };
  },
};

export const outOfMemory: Matcher = {
  id: "oom-error",
  name: "Out of Memory",
  frameworks: ["node"],
  test: (input) => /FATAL ERROR.*heap|JavaScript heap out of memory|Killed.*signal 9|OOMKilled/i.test(input),
  match(input) {
    const isNode = /JavaScript heap out of memory/.test(input);
    const isDocker = /OOMKilled/.test(input);

    return {
      id: this.id,
      pattern: "Out of Memory",
      explanation: `Process killed — ${isDocker ? "container" : "Node.js"} ran out of memory. Either the process has a memory leak or the workload exceeds available memory.`,
      fixes: [
        ...(isNode
          ? [{ description: "Increase Node.js memory limit", command: "node --max-old-space-size=4096 app.js", safe: true }]
          : []),
        ...(isDocker
          ? [{ description: "Increase container memory limit in docker-compose.yml", safe: false }]
          : []),
        { description: "Profile memory usage to find leaks", safe: false },
        { description: "Process large datasets in streams/batches instead of loading all at once", safe: false },
        { description: "Check for event listener leaks (addEventListener without removeEventListener)", safe: false },
      ],
      confidence: 0.92,
      category: "memory",
      matched: input.match(/heap out of memory|OOMKilled|FATAL ERROR/)![0],
    };
  },
};

export const gitError: Matcher = {
  id: "git-error",
  name: "Git Error",
  frameworks: [],
  test: (input) => /fatal:.*git|merge conflict|CONFLICT \(content\)|Your branch is behind/i.test(input),
  match(input) {
    const mergeConflict = /CONFLICT \(content\)|merge conflict/i.test(input);
    const branchBehind = /Your branch is behind/.test(input);
    const diverged = /have diverged/.test(input);
    const detachedHead = /detached HEAD/.test(input);
    const notGitRepo = /not a git repository/.test(input);

    if (mergeConflict) {
      return {
        id: this.id, pattern: "Git: Merge conflict",
        explanation: "Merge conflict — the same file was modified differently in both branches. You need to manually resolve the conflict markers (<<<<<<<, =======, >>>>>>>).",
        fixes: [
          { description: "Open conflicted files and resolve the conflict markers", safe: false },
          { description: "See conflicted files", command: "git diff --name-only --diff-filter=U", safe: true },
          { description: "Accept current branch changes", command: "git checkout --ours <file>", safe: false },
          { description: "Accept incoming changes", command: "git checkout --theirs <file>", safe: false },
        ],
        confidence: 0.95, category: "runtime",
        matched: input.match(/CONFLICT \(content\)|merge conflict/i)![0],
      };
    }

    if (branchBehind || diverged) {
      return {
        id: this.id, pattern: "Git: Branch behind/diverged",
        explanation: diverged ? "Your local branch and the remote have diverged — both have new commits." : "Your local branch is behind the remote. Pull to get the latest changes.",
        fixes: [
          { description: "Pull latest changes", command: "git pull --rebase", safe: true },
          { description: "If diverged, rebase onto remote", command: "git pull --rebase origin main", safe: false },
        ],
        confidence: 0.85, category: "runtime",
        matched: input.match(/behind|diverged/)![0],
      };
    }

    if (detachedHead) {
      return {
        id: this.id, pattern: "Git: Detached HEAD",
        explanation: "You're in detached HEAD state — not on any branch. Commits made here will be lost unless you create a branch.",
        fixes: [
          { description: "Create a new branch from here", command: "git checkout -b new-branch-name", safe: true },
          { description: "Go back to a branch", command: "git checkout main", safe: false },
        ],
        confidence: 0.9, category: "runtime",
        matched: "detached HEAD",
      };
    }

    if (notGitRepo) {
      return {
        id: this.id, pattern: "Git: Not a repository",
        explanation: "You're not in a git repository. Either initialize one or navigate to the correct directory.",
        fixes: [
          { description: "Initialize a git repository", command: "git init", safe: true },
          { description: "Check you're in the right directory", command: "pwd", safe: true },
        ],
        confidence: 0.95, category: "environment",
        matched: "not a git repository",
      };
    }

    return {
      id: this.id, pattern: "Git Error",
      explanation: "Git error.",
      fixes: [{ description: "Check git status", command: "git status", safe: true }],
      confidence: 0.4, category: "runtime",
      matched: input.match(/fatal:.*git/i)?.[0] ?? "Git error",
    };
  },
};

export const permissionDenied: Matcher = {
  id: "permission-denied",
  name: "Permission Denied",
  frameworks: [],
  test: (input) => /Permission denied|EPERM|operation not permitted/i.test(input),
  match(input) {
    const sshDenied = /Permission denied \(publickey\)/.test(input);
    const file = extractGroup(input, /(?:Permission denied|EPERM).*?'([^']+)'/);

    if (sshDenied) {
      return {
        id: this.id, pattern: "SSH: Permission denied",
        explanation: "SSH authentication failed. Your SSH key isn't recognized by the server.",
        fixes: [
          { description: "Check your SSH key is added to ssh-agent", command: "ssh-add -l", safe: true },
          { description: "Add your SSH key to the agent", command: "ssh-add ~/.ssh/id_ed25519", safe: true },
          { description: "For GitHub, add your public key at github.com/settings/keys", safe: false },
          { description: "Test SSH connection", command: "ssh -T git@github.com", safe: true },
        ],
        confidence: 0.95, category: "permission",
        matched: "Permission denied (publickey)",
      };
    }

    return {
      id: this.id, pattern: "Permission Denied",
      explanation: `Permission denied${file ? ` for "${file}"` : ""}. The process doesn't have the required permissions.`,
      fixes: [
        { description: "Check file permissions", command: file ? `ls -la ${file}` : undefined, safe: true },
        { description: "Fix ownership if needed", safe: false },
        { description: "Avoid using sudo with npm — fix npm permissions instead", safe: false },
      ],
      confidence: 0.8, category: "permission",
      matched: input.match(/Permission denied|EPERM/)![0],
    };
  },
};

export const segfault: Matcher = {
  id: "segfault",
  name: "Segmentation Fault",
  frameworks: ["rust", "go"],
  test: (input) => /Segmentation fault|SIGSEGV|signal 11/.test(input),
  match() {
    return {
      id: this.id,
      pattern: "Segmentation Fault (SIGSEGV)",
      explanation: "The process tried to access memory it shouldn't. In native code, this means a null pointer dereference, buffer overflow, or use-after-free.",
      fixes: [
        { description: "Run with AddressSanitizer to find the exact source", safe: false },
        { description: "Check for null/dangling pointer dereferences", safe: false },
        { description: "Use Valgrind or GDB to debug", safe: false },
        { description: "In Node.js, this usually means a bug in a native addon — update or reinstall it", safe: false },
      ],
      confidence: 0.85,
      category: "memory",
      matched: "Segmentation fault",
    };
  },
};
