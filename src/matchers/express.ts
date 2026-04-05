import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const expressRouteNotFound: Matcher = {
  id: "express-route-not-found",
  name: "Express Route Not Found",
  frameworks: ["express", "node"],
  test: (input) => /Cannot (GET|POST|PUT|DELETE|PATCH|OPTIONS)\s+\//.test(input),
  match(input) {
    const method = extractGroup(input, /Cannot (GET|POST|PUT|DELETE|PATCH|OPTIONS)/);
    const route = extractGroup(input, /Cannot (?:GET|POST|PUT|DELETE|PATCH|OPTIONS)\s+(\/\S*)/);

    return {
      id: this.id,
      pattern: "Express 404: Route Not Found",
      explanation: `No route handler defined for ${method ?? "the method"} ${route ?? "this path"}. Express couldn't find a matching route and returned a 404.`,
      fixes: [
        { description: `Add a route handler: app.${(method ?? "get").toLowerCase()}('${route ?? "/path"}', (req, res) => { ... })`, safe: false },
        { description: "Check for typos in the route path or HTTP method", safe: false },
        { description: "Make sure the router is mounted with app.use() before the request hits", safe: false },
        { description: "Add a catch-all 404 handler: app.use((req, res) => res.status(404).send('Not Found'))", safe: false },
      ],
      confidence: 0.95,
      category: "config",
      framework: "express",
      matched: input.match(/Cannot (GET|POST|PUT|DELETE|PATCH|OPTIONS)\s+\/\S*/)![0],
    };
  },
};

export const expressBodyUndefined: Matcher = {
  id: "express-body-undefined",
  name: "Express req.body Undefined",
  frameworks: ["express", "node"],
  test: (input) => /req\.body\s+is\s+undefined|Cannot read propert(?:y|ies) of undefined.*req\.body|TypeError.*body/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "req.body is undefined",
      explanation: "req.body is undefined because no body-parsing middleware is configured. Express does not parse request bodies by default.",
      fixes: [
        { description: "Add JSON body parser: app.use(express.json())", safe: false },
        { description: "For form data: app.use(express.urlencoded({ extended: true }))", safe: false },
        { description: "Make sure the middleware is added BEFORE your route handlers", safe: false },
        { description: "Check that the client is sending the correct Content-Type header", safe: false },
      ],
      confidence: 0.92,
      category: "config",
      framework: "express",
      matched: "req.body is undefined",
    };
  },
};

export const expressViewError: Matcher = {
  id: "express-view-error",
  name: "Express View Lookup Error",
  frameworks: ["express", "node"],
  test: (input) => /Failed to lookup view/.test(input),
  match(input) {
    const view = extractGroup(input, /Failed to lookup view "([^"]+)"/);

    return {
      id: this.id,
      pattern: "Failed to lookup view",
      explanation: `Express could not find the view template "${view ?? "unknown"}". The template engine is misconfigured or the view file is missing.`,
      fixes: [
        { description: "Set the views directory: app.set('views', path.join(__dirname, 'views'))", safe: false },
        { description: "Set the view engine: app.set('view engine', 'ejs') (or pug, hbs, etc.)", safe: false },
        { description: `Check that the view file "${view ?? "template"}" exists in your views directory`, safe: false },
        { description: "Install the template engine package", command: "npm install ejs", safe: true },
      ],
      confidence: 0.93,
      category: "config",
      framework: "express",
      matched: input.match(/Failed to lookup view[^"]*"[^"]*"/)![0] ?? "Failed to lookup view",
    };
  },
};

export const expressPayloadTooLarge: Matcher = {
  id: "express-payload-too-large",
  name: "Express PayloadTooLargeError",
  frameworks: ["express", "node"],
  test: (input) => /PayloadTooLargeError|request entity too large|413.*Payload Too Large/i.test(input),
  match(input) {
    const limit = extractGroup(input, /limit:\s*(\d+\s*\w+)/i);

    return {
      id: this.id,
      pattern: "PayloadTooLargeError",
      explanation: `The request body exceeds the size limit${limit ? ` (${limit})` : ""}. Express defaults to a 100KB limit for JSON bodies.`,
      fixes: [
        { description: "Increase the body size limit: app.use(express.json({ limit: '10mb' }))", safe: false },
        { description: "For file uploads, use multer instead of body-parser", command: "npm install multer", safe: true },
        { description: "If behind a reverse proxy (nginx), increase client_max_body_size too", safe: false },
      ],
      confidence: 0.94,
      category: "config",
      framework: "express",
      matched: input.match(/PayloadTooLargeError|request entity too large|413.*Payload Too Large/i)![0],
    };
  },
};

export const expressHeadersSent: Matcher = {
  id: "express-headers-sent",
  name: "Express Headers Already Sent",
  frameworks: ["express", "node"],
  test: (input) => /ERR_HTTP_HEADERS_SENT|Can't set headers after they are sent|Cannot set headers after they are sent/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "ERR_HTTP_HEADERS_SENT",
      explanation: "Tried to send a response after one was already sent. This usually means a route handler calls res.send(), res.json(), or res.redirect() more than once — often because of a missing return statement or an async timing issue.",
      fixes: [
        { description: "Add 'return' before res.send()/res.json() in conditional branches", safe: false },
        { description: "Make sure only one response is sent per request (check if/else and try/catch blocks)", safe: false },
        { description: "In async handlers, make sure awaited operations don't trigger a second response", safe: false },
        { description: "Check that next() and res.send() aren't both called in the same middleware", safe: false },
      ],
      confidence: 0.95,
      category: "runtime",
      framework: "express",
      matched: input.match(/ERR_HTTP_HEADERS_SENT|Can't set headers after they are sent|Cannot set headers after they are sent/i)![0],
    };
  },
};
