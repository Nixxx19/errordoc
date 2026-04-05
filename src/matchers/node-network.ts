import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const econnrefused: Matcher = {
  id: "node-econnrefused",
  name: "ECONNREFUSED",
  frameworks: ["node"],
  test: (input) => /ECONNREFUSED/.test(input),
  match(input) {
    const addr = extractGroup(input, /ECONNREFUSED\s+(\S+)/);
    const port = extractGroup(input, /:(\d+)$/m);

    const isRedis = port === "6379";
    const isPostgres = port === "5432";
    const isMongo = port === "27017";
    const isMysql = port === "3306";
    const isApi = port === "3000" || port === "8080" || port === "4000";

    let service = "the target service";
    if (isRedis) service = "Redis";
    if (isPostgres) service = "PostgreSQL";
    if (isMongo) service = "MongoDB";
    if (isMysql) service = "MySQL";
    if (isApi) service = "the API server";

    return {
      id: this.id,
      pattern: "ECONNREFUSED",
      explanation: `Connection refused to ${addr ?? "the target"}. ${service} is not running or is not accepting connections on that port.`,
      fixes: [
        { description: `Start ${service}`, command: isRedis ? "redis-server" : isPostgres ? "pg_ctl start" : isMongo ? "mongod" : undefined, safe: true },
        { description: "Check if the service is running on the expected port", safe: false },
        { description: "If using Docker, ensure the container is running and ports are mapped", command: "docker ps", safe: true },
        { description: "Check your .env file — the connection URL may be wrong", safe: false },
      ],
      confidence: 0.95,
      category: "network",
      matched: input.match(/ECONNREFUSED\s+\S+/)![0],
    };
  },
};

export const eaddrinuse: Matcher = {
  id: "node-eaddrinuse",
  name: "EADDRINUSE",
  frameworks: ["node"],
  test: (input) => /EADDRINUSE/.test(input),
  match(input) {
    const port = extractGroup(input, /(?:EADDRINUSE|address already in use)[^\d]*(\d+)/);

    return {
      id: this.id,
      pattern: "EADDRINUSE",
      explanation: `Port ${port ?? "?"} is already in use. Another process is listening on this port — likely a previous instance of your server that didn't shut down.`,
      fixes: [
        {
          description: `Find and kill the process using port ${port ?? "the port"}`,
          command: port ? `lsof -i :${port} | grep LISTEN` : undefined,
          safe: true,
        },
        {
          description: `Kill the process on port ${port ?? "the port"}`,
          command: port ? `kill $(lsof -t -i :${port})` : undefined,
          safe: false,
        },
        { description: "Use a different port via environment variable (PORT=3001)", safe: false },
      ],
      confidence: 0.95,
      category: "network",
      matched: `EADDRINUSE: port ${port ?? "?"}`,
    };
  },
};

export const eacces: Matcher = {
  id: "node-eacces",
  name: "EACCES",
  frameworks: ["node"],
  test: (input) => /EACCES/.test(input),
  match(input) {
    const path = extractGroup(input, /EACCES[:\s]+permission denied[,\s]+(?:access\s+)?'([^']+)'/);
    const portIssue = /EACCES.*(?:listen|bind)/.test(input);
    const port = extractGroup(input, /:(\d+)/);

    if (portIssue && port && parseInt(port) < 1024) {
      return {
        id: this.id,
        pattern: "EACCES: privileged port",
        explanation: `Ports below 1024 require root privileges. Port ${port} is a privileged port.`,
        fixes: [
          { description: "Use a port above 1024 (e.g., 3000, 8080)", safe: false },
          { description: "Run with sudo (not recommended for development)", safe: false },
        ],
        confidence: 0.95,
        category: "permission",
        matched: `EACCES: port ${port}`,
      };
    }

    return {
      id: this.id,
      pattern: "EACCES: permission denied",
      explanation: `Permission denied${path ? ` for "${path}"` : ""}. The process doesn't have the required file system permissions.`,
      fixes: [
        {
          description: "Fix file permissions",
          command: path ? `chmod 755 ${path}` : undefined,
          safe: false,
        },
        {
          description: "Check file ownership",
          command: path ? `ls -la ${path}` : undefined,
          safe: true,
        },
        { description: "Don't use sudo with npm — fix npm permissions instead", command: "npm config set prefix ~/.npm-global", safe: true },
      ],
      confidence: 0.9,
      category: "permission",
      matched: path ? `EACCES: ${path}` : "EACCES: permission denied",
    };
  },
};

export const enoent: Matcher = {
  id: "node-enoent",
  name: "ENOENT",
  frameworks: ["node"],
  test: (input) => /ENOENT/.test(input),
  match(input) {
    const path = extractGroup(input, /ENOENT[:\s]+no such file or directory[,\s]+(?:\w+\s+)?'([^']+)'/);

    return {
      id: this.id,
      pattern: "ENOENT: no such file or directory",
      explanation: `File or directory not found${path ? `: "${path}"` : ""}. The path doesn't exist, is misspelled, or you're running the command from the wrong directory.`,
      fixes: [
        { description: "Check that the file path is correct", command: path ? `ls -la ${path}` : undefined, safe: true },
        { description: "Verify your current working directory", command: "pwd", safe: true },
        { description: "Check for typos in the file path", safe: false },
        ...(path?.includes("node_modules")
          ? [{ description: "Reinstall dependencies", command: "rm -rf node_modules && npm install", safe: true }]
          : []),
      ],
      confidence: 0.9,
      category: "runtime",
      matched: path ? `ENOENT: "${path}"` : "ENOENT: no such file or directory",
    };
  },
};

export const etimeout: Matcher = {
  id: "node-timeout",
  name: "Connection Timeout",
  frameworks: ["node"],
  test: (input) => /ETIMEDOUT|ESOCKETTIMEDOUT|ECONNABORTED|request.*timeout|connect.*timeout/i.test(input),
  match(input) {
    const host = extractGroup(input, /(?:ETIMEDOUT|timeout).*?(\d+\.\d+\.\d+\.\d+|\S+\.\S+\.\w+)/);

    return {
      id: this.id,
      pattern: "Connection Timeout",
      explanation: `Connection timed out${host ? ` to ${host}` : ""}. The remote server didn't respond in time — it might be down, overloaded, or behind a firewall.`,
      fixes: [
        { description: "Check if the remote service is reachable", command: host ? `curl -I ${host}` : undefined, safe: true },
        { description: "Increase the timeout value in your request configuration", safe: false },
        { description: "Check your network connection and DNS settings", safe: false },
        { description: "If behind a proxy/VPN, check proxy settings", safe: false },
      ],
      confidence: 0.85,
      category: "network",
      matched: input.match(/ETIMEDOUT|ESOCKETTIMEDOUT|timeout/i)![0],
    };
  },
};

export const corsError: Matcher = {
  id: "node-cors",
  name: "CORS Error",
  frameworks: ["node"],
  test: (input) => /CORS|Access-Control-Allow-Origin|cross-origin|blocked by CORS/i.test(input),
  match(input) {
    const origin = extractGroup(input, /origin '([^']+)'/);

    return {
      id: this.id,
      pattern: "CORS Policy Error",
      explanation: `Cross-Origin Request Blocked. The server${origin ? ` at ${origin}` : ""} doesn't include the right CORS headers, so the browser blocks the request for security.`,
      fixes: [
        { description: "Add CORS middleware to your server", command: "npm install cors", safe: true },
        { description: "If using Express: app.use(cors({ origin: 'http://localhost:3000' }))", safe: false },
        { description: "For development, use a proxy in your frontend dev server config", safe: false },
        { description: "If you don't control the server, use a server-side proxy", safe: false },
      ],
      confidence: 0.92,
      category: "network",
      framework: "express",
      matched: input.match(/CORS|Access-Control-Allow-Origin|cross-origin/)![0],
    };
  },
};

export const fetchError: Matcher = {
  id: "node-fetch-error",
  name: "Fetch/HTTP Error",
  frameworks: ["node"],
  test: (input) => /fetch failed|ENOTFOUND|getaddrinfo.*ENOTFOUND/.test(input),
  match(input) {
    const host = extractGroup(input, /ENOTFOUND\s+(\S+)/);

    return {
      id: this.id,
      pattern: "DNS/Fetch Error",
      explanation: `DNS lookup failed${host ? ` for "${host}"` : ""}. The hostname doesn't exist or can't be resolved — likely a typo in the URL or a DNS issue.`,
      fixes: [
        { description: "Check for typos in the URL/hostname", safe: false },
        { description: "Verify DNS resolution", command: host ? `nslookup ${host}` : undefined, safe: true },
        { description: "Check your internet connection", safe: false },
        { description: "If in Docker, check that the container has network access", safe: false },
      ],
      confidence: 0.9,
      category: "network",
      matched: input.match(/ENOTFOUND\s+\S+|fetch failed/)![0],
    };
  },
};
