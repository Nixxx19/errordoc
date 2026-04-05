import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const supabaseJwtExpired: Matcher = {
  id: "supabase-jwt-expired",
  name: "Supabase JWT Expired",
  frameworks: ["node"],
  test: (input) => /JWT expired|JWTExpired|token.*expired/i.test(input) && /supabase|postgrest|pgrst/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "Supabase JWT Expired",
      explanation: "The Supabase auth token has expired. PostgREST rejects requests with expired JWTs. By default, Supabase tokens expire after 1 hour.",
      fixes: [
        { description: "Call supabase.auth.refreshSession() to get a new token", safe: false },
        { description: "Set up an onAuthStateChange listener to auto-refresh tokens", safe: false },
        { description: "Check that your client is using supabase.auth.getSession() which auto-refreshes", safe: false },
        { description: "Increase JWT expiry time in Supabase Dashboard > Settings > Auth", safe: false },
      ],
      confidence: 0.93,
      category: "auth",
      framework: "supabase",
      matched: input.match(/JWT expired|JWTExpired|token.*expired/i)![0],
    };
  },
};

export const supabaseRlsViolation: Matcher = {
  id: "supabase-rls-violation",
  name: "Supabase RLS Violation",
  frameworks: ["node"],
  test: (input) => /new row violates row-level security|row-level security/i.test(input),
  match(input) {
    const table = extractGroup(input, /(?:table|relation)\s+["']?(\w+)["']?/i);

    return {
      id: this.id,
      pattern: "Row-Level Security Violation",
      explanation: `Row-level security (RLS) policy blocked this operation${table ? ` on table "${table}"` : ""}. The authenticated user doesn't match any USING or WITH CHECK policy.`,
      fixes: [
        { description: "Check your RLS policies in Supabase Dashboard > Database > Policies", safe: false },
        { description: "Verify the user is authenticated: the anon key won't pass policies requiring auth.uid()", safe: false },
        { description: "For INSERT, you need a WITH CHECK policy. For SELECT/UPDATE/DELETE, you need a USING policy", safe: false },
        { description: "For debugging, temporarily disable RLS on the table (DO NOT do this in production)", safe: false },
      ],
      confidence: 0.94,
      category: "permission",
      framework: "supabase",
      matched: input.match(/new row violates row-level security|row-level security/i)![0],
    };
  },
};

export const supabaseRelationNotExist: Matcher = {
  id: "supabase-relation-not-exist",
  name: "Supabase Relation Does Not Exist",
  frameworks: ["node"],
  test: (input) => /relation ["']?\w+["']? does not exist/i.test(input),
  match(input) {
    const table = extractGroup(input, /relation ["']?(\w+)["']? does not exist/i);

    return {
      id: this.id,
      pattern: "Relation does not exist",
      explanation: `The table or view "${table ?? "unknown"}" does not exist in the database. It may not have been created, the migration didn't run, or the name is wrong.`,
      fixes: [
        { description: "Check the table name for typos (names are case-sensitive)", safe: false },
        { description: "Run pending migrations", command: "npx supabase db push", safe: false },
        { description: "Check if the table exists in the correct schema (public vs. a custom schema)", safe: false },
        { description: "Create the table in Supabase Dashboard > SQL Editor or via a migration", safe: false },
      ],
      confidence: 0.94,
      category: "database",
      framework: "supabase",
      matched: input.match(/relation ["']?\w+["']? does not exist/i)![0],
    };
  },
};

export const supabaseFunctionNotFound: Matcher = {
  id: "supabase-function-not-found",
  name: "Supabase Function Not Found",
  frameworks: ["node"],
  test: (input) => /Could not find the (?:function|public\.)/i.test(input) || /function .+ does not exist/i.test(input),
  match(input) {
    const fn = extractGroup(input, /(?:function|public\.)["'\s]+(\w+)/i) ??
      extractGroup(input, /function (\w+)/i);

    return {
      id: this.id,
      pattern: "Supabase Function Not Found",
      explanation: `The database function "${fn ?? "unknown"}" does not exist. It may not have been created or the function signature doesn't match the call.`,
      fixes: [
        { description: "Check the function name and argument types match exactly", safe: false },
        { description: "Create the function via Supabase Dashboard > SQL Editor", safe: false },
        { description: "If using supabase.rpc(), verify the function is in the public schema", safe: false },
        { description: "Check that the function's parameter names match what you're passing", safe: false },
      ],
      confidence: 0.92,
      category: "database",
      framework: "supabase",
      matched: input.match(/Could not find the (?:function|public\.)|function .+ does not exist/i)![0],
    };
  },
};

export const supabasePgrstError: Matcher = {
  id: "supabase-pgrst-error",
  name: "Supabase PGRST Error",
  frameworks: ["node"],
  test: (input) => /PGRST\d{3}/.test(input),
  match(input) {
    const code = extractGroup(input, /(PGRST\d{3})/);

    const pgrstMessages: Record<string, string> = {
      PGRST116: "The result contained zero rows — .single() or .maybeSingle() expected exactly one row.",
      PGRST204: "The column specified in the query does not exist in the table.",
      PGRST200: "An ambiguous embedded resource was found — the relationship between tables is unclear.",
      PGRST301: "The JWT secret is misconfigured or the token is malformed.",
      PGRST302: "The role specified in the JWT doesn't exist in the database.",
      PGRST100: "There's a syntax error in the query filters.",
      PGRST201: "The table or view cannot be found — it may not be exposed via the API.",
      PGRST202: "The function cannot be found in the schema or has the wrong parameters.",
    };

    const explanation = code && pgrstMessages[code]
      ? pgrstMessages[code]
      : `PostgREST error ${code ?? "unknown"}. This is a Supabase API layer error.`;

    const fixes = [];
    if (code === "PGRST116") {
      fixes.push(
        { description: "Use .maybeSingle() instead of .single() if zero rows is a valid case", safe: false },
        { description: "Add a .eq() or .filter() to narrow the query to exactly one row", safe: false },
      );
    } else if (code === "PGRST204") {
      fixes.push(
        { description: "Check the column name for typos in your .select() or .eq() call", safe: false },
        { description: "Verify the column exists in the table schema", safe: false },
      );
    } else if (code === "PGRST200") {
      fixes.push(
        { description: "Specify the relationship explicitly using !inner or !left hints", safe: false },
        { description: "Check foreign key relationships between the tables", safe: false },
      );
    } else {
      fixes.push(
        { description: `Look up ${code ?? "the error code"} in the PostgREST documentation`, safe: false },
        { description: "Check your Supabase query syntax and table/column names", safe: false },
      );
    }
    fixes.push(
      { description: "Check the Supabase Dashboard > Logs for more details", safe: false },
    );

    return {
      id: this.id,
      pattern: `PostgREST ${code ?? "Error"}`,
      explanation,
      fixes,
      confidence: 0.91,
      category: "database",
      framework: "supabase",
      matched: input.match(/PGRST\d{3}/)![0],
    };
  },
};
