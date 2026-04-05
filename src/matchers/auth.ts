import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const oauthError: Matcher = {
  id: "auth-oauth-error",
  name: "OAuth Error",
  frameworks: ["node"],
  test: (input) => /invalid_grant|invalid_client|invalid_scope|invalid_request|unauthorized_client/i.test(input),
  match(input) {
    const code = extractGroup(input, /(invalid_grant|invalid_client|invalid_scope|invalid_request|unauthorized_client)/i);

    const explanations: Record<string, string> = {
      invalid_grant: "The authorization grant (code, refresh token, or credentials) is invalid, expired, or revoked.",
      invalid_client: "Client authentication failed. The client_id or client_secret is wrong.",
      invalid_scope: "The requested scope is invalid, unknown, or malformed.",
      invalid_request: "The OAuth request is malformed — a required parameter is missing or invalid.",
      unauthorized_client: "The client is not authorized to use this grant type.",
    };

    return {
      id: this.id,
      pattern: `OAuth: ${code ?? "error"}`,
      explanation: code ? explanations[code.toLowerCase()] ?? `OAuth error: ${code}` : "An OAuth authentication error occurred.",
      fixes: [
        { description: "Check your client_id and client_secret are correct", safe: false },
        { description: "If using a refresh token, it may have expired or been revoked — re-authenticate", safe: false },
        { description: "Verify the redirect_uri matches exactly what's configured in the OAuth provider", safe: false },
        { description: "Check that the authorization code hasn't expired (codes are typically single-use)", safe: false },
      ],
      confidence: 0.93,
      category: "auth",
      matched: input.match(/invalid_grant|invalid_client|invalid_scope|invalid_request|unauthorized_client/i)![0],
    };
  },
};

export const corsPreflightAuth: Matcher = {
  id: "auth-cors-preflight",
  name: "CORS Preflight on Auth Endpoint",
  frameworks: ["node"],
  test: (input) => /CORS.*(?:auth|login|token|oauth)|(?:auth|login|token|oauth).*CORS|preflight.*(?:auth|login|token)/i.test(input),
  match(input) {
    const endpoint = extractGroup(input, /(?:CORS|preflight).*(?:to|from|for)\s+["']?(\S+?)["']?(?:\s|$)/i);

    return {
      id: this.id,
      pattern: "CORS preflight failure on auth endpoint",
      explanation: `The browser's CORS preflight (OPTIONS) request to ${endpoint ?? "the auth endpoint"} was rejected. The server must handle OPTIONS requests and include the right CORS headers for authentication to work.`,
      fixes: [
        { description: "Add CORS headers that allow the Authorization header: Access-Control-Allow-Headers: Authorization, Content-Type", safe: false },
        { description: "Ensure the server responds to OPTIONS requests with 200/204", safe: false },
        { description: "If using credentials (cookies), set Access-Control-Allow-Credentials: true", safe: false },
        { description: "Avoid using wildcard (*) for Access-Control-Allow-Origin when credentials are involved", safe: false },
      ],
      confidence: 0.87,
      category: "auth",
      matched: input.match(/CORS.*(?:auth|login|token|oauth)|(?:auth|login|token|oauth).*CORS|preflight.*(?:auth|login|token)/i)![0],
    };
  },
};

export const unauthorized401: Matcher = {
  id: "auth-401-unauthorized",
  name: "401 Unauthorized",
  frameworks: ["node"],
  test: (input) => /401\s*Unauthorized|HTTP.*401|status.*401/i.test(input),
  match(input) {
    const endpoint = extractGroup(input, /(?:401).*(?:at|for|from)\s+["']?(\S+?)["']?(?:\s|$)/i);

    return {
      id: this.id,
      pattern: "401 Unauthorized",
      explanation: `The request to ${endpoint ?? "the server"} was rejected because no valid authentication credentials were provided. The token may be missing, expired, or invalid.`,
      fixes: [
        { description: "Check that the Authorization header is being sent with the request", safe: false },
        { description: "Verify the token format: 'Bearer <token>' (with a space after Bearer)", safe: false },
        { description: "Check if the token has expired and refresh it", safe: false },
        { description: "Verify the API key or credentials are correct", safe: false },
      ],
      confidence: 0.85,
      category: "auth",
      matched: input.match(/401\s*Unauthorized|HTTP.*401|status.*401/i)![0],
    };
  },
};

export const forbidden403: Matcher = {
  id: "auth-403-forbidden",
  name: "403 Forbidden",
  frameworks: ["node"],
  test: (input) => /403\s*Forbidden|HTTP.*403|status.*403/i.test(input),
  match(input) {
    const endpoint = extractGroup(input, /(?:403).*(?:at|for|from)\s+["']?(\S+?)["']?(?:\s|$)/i);

    return {
      id: this.id,
      pattern: "403 Forbidden",
      explanation: `Access to ${endpoint ?? "the resource"} is forbidden. You're authenticated but don't have the required permissions or role for this action.`,
      fixes: [
        { description: "Check that the user has the required role or permission for this endpoint", safe: false },
        { description: "Verify API key scopes — it may need additional permissions", safe: false },
        { description: "Check server-side access control rules (RBAC, ACL)", safe: false },
        { description: "If IP-based restriction, check the allow list", safe: false },
      ],
      confidence: 0.85,
      category: "auth",
      matched: input.match(/403\s*Forbidden|HTTP.*403|status.*403/i)![0],
    };
  },
};

export const sessionExpired: Matcher = {
  id: "auth-session-expired",
  name: "Session Expired",
  frameworks: ["node"],
  test: (input) => /session.*(?:expired|invalid|not found|timeout)|(?:expired|invalid).*session/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "Session Expired",
      explanation: "The user's session has expired or is invalid. Sessions typically expire after a period of inactivity or when the server-side session store is cleared.",
      fixes: [
        { description: "Redirect the user to the login page to re-authenticate", safe: false },
        { description: "Increase the session maxAge/TTL in your session configuration", safe: false },
        { description: "Use a persistent session store (Redis, database) instead of in-memory sessions", safe: false },
        { description: "Implement automatic session refresh with a refresh token", safe: false },
      ],
      confidence: 0.88,
      category: "auth",
      matched: input.match(/session.*(?:expired|invalid|not found|timeout)|(?:expired|invalid).*session/i)![0],
    };
  },
};

export const csrfTokenMismatch: Matcher = {
  id: "auth-csrf-mismatch",
  name: "CSRF Token Mismatch",
  frameworks: ["node"],
  test: (input) => /CSRF.*(?:token|mismatch|invalid|missing)|EBADCSRFTOKEN|ForbiddenError.*csrf/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "CSRF Token Mismatch",
      explanation: "The CSRF token is missing or doesn't match. This protection prevents cross-site request forgery attacks, but it can cause issues with SPA frontends or API clients.",
      fixes: [
        { description: "Include the CSRF token in your form or request headers (typically X-CSRF-Token)", safe: false },
        { description: "If using a SPA, fetch the CSRF token from a dedicated endpoint or cookie", safe: false },
        { description: "For API-only servers, consider using stateless auth (JWT) instead of CSRF tokens", safe: false },
        { description: "Check that cookies are being sent with the request (credentials: 'include' in fetch)", safe: false },
      ],
      confidence: 0.92,
      category: "auth",
      matched: input.match(/CSRF.*(?:token|mismatch|invalid|missing)|EBADCSRFTOKEN|ForbiddenError.*csrf/i)![0],
    };
  },
};
