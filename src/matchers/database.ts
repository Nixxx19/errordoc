import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const prismaError: Matcher = {
  id: "prisma-error",
  name: "Prisma Error",
  frameworks: ["prisma"],
  test: (input) => /PrismaClient|prisma.*error|P\d{4}/i.test(input),
  match(input) {
    const code = extractGroup(input, /(P\d{4})/);
    const prismaErrors: Record<string, { explanation: string; fixes: string[] }> = {
      P1001: {
        explanation: "Can't reach the database server. The database is down, the connection string is wrong, or the port is blocked.",
        fixes: ["Check your DATABASE_URL in .env", "Ensure the database is running", "Check network/firewall rules"],
      },
      P1002: {
        explanation: "Database server timed out. The server is overloaded or unreachable.",
        fixes: ["Increase connection timeout in the connection string", "Check database server health", "Consider connection pooling"],
      },
      P1003: {
        explanation: "Database does not exist. The database name in your connection string doesn't exist on the server.",
        fixes: ["Create the database: npx prisma db push", "Check DATABASE_URL for the correct database name", "Run: npx prisma migrate dev"],
      },
      P2002: {
        explanation: "Unique constraint violation. You're trying to insert a duplicate value in a unique column.",
        fixes: ["Check for existing records before inserting", "Use upsert() instead of create()", "Check which field has the unique constraint"],
      },
      P2003: {
        explanation: "Foreign key constraint violation. The related record doesn't exist.",
        fixes: ["Create the related record first", "Check the foreign key ID is correct", "Use cascading deletes if appropriate"],
      },
      P2025: {
        explanation: "Record not found. The record you're trying to update or delete doesn't exist.",
        fixes: ["Check the ID/filter is correct", "Use findFirst() to check existence before updating", "Handle the case where the record is already deleted"],
      },
    };

    const known = code ? prismaErrors[code] : undefined;

    if (!known && !code) {
      const clientNotGenerated = /PrismaClient.*not generated|prisma generate/.test(input);
      if (clientNotGenerated) {
        return {
          id: this.id, pattern: "Prisma: Client not generated",
          explanation: "PrismaClient hasn't been generated yet. You need to run prisma generate after changing the schema.",
          fixes: [
            { description: "Generate the Prisma client", command: "npx prisma generate", safe: true },
            { description: "Add 'prisma generate' to your postinstall script", safe: false },
          ],
          confidence: 0.95, category: "database", framework: "prisma",
          matched: input.match(/PrismaClient.*not generated|prisma generate/)![0],
        };
      }
    }

    return {
      id: this.id,
      pattern: `Prisma ${code ?? "error"}`,
      explanation: known?.explanation ?? `Prisma error ${code ?? ""}: check the Prisma docs.`,
      fixes: (known?.fixes ?? ["Check Prisma documentation", "Run: npx prisma studio"]).map((f) => ({
        description: f,
        command: f.startsWith("Run: ") ? f.slice(5) : undefined,
        safe: f.includes("npx prisma"),
      })),
      confidence: known ? 0.92 : 0.6,
      category: "database",
      framework: "prisma",
      matched: input.match(/P\d{4}|PrismaClient.*error/)![0],
      docsUrl: code ? `https://www.prisma.io/docs/reference/api-reference/error-reference#${code.toLowerCase()}` : undefined,
    };
  },
};

export const mongoError: Matcher = {
  id: "mongo-error",
  name: "MongoDB Error",
  frameworks: ["mongodb"],
  test: (input) => /MongoError|MongoServerError|MongooseError|ECONNREFUSED.*27017/.test(input),
  match(input) {
    const dupKey = /E11000 duplicate key/.test(input);
    const authFailed = /Authentication failed|AuthenticationFailed/.test(input);
    const connectionFailed = /ECONNREFUSED.*27017|MongoNetworkError|failed to connect/.test(input);
    const validationError = /MongooseError.*validation|ValidationError/.test(input);

    if (dupKey) {
      const field = extractGroup(input, /index: (\w+)/) ?? extractGroup(input, /dup key: \{ (\w+):/);
      return {
        id: this.id, pattern: "MongoDB: Duplicate Key",
        explanation: `Duplicate key error${field ? ` on field "${field}"` : ""}. A document with this unique value already exists.`,
        fixes: [
          { description: "Check for existing documents before inserting", safe: false },
          { description: "Use updateOne with upsert: true", safe: false },
          { description: "Remove the duplicate index if uniqueness isn't required", safe: false },
        ],
        confidence: 0.95, category: "database", framework: "mongodb",
        matched: "E11000 duplicate key error",
      };
    }

    if (authFailed) {
      return {
        id: this.id, pattern: "MongoDB: Auth Failed",
        explanation: "MongoDB authentication failed. Wrong username, password, or auth database.",
        fixes: [
          { description: "Check MONGODB_URI credentials", safe: false },
          { description: "Ensure the user exists in the correct auth database (usually 'admin')", safe: false },
          { description: "For Atlas, check IP whitelist includes your IP", safe: false },
        ],
        confidence: 0.92, category: "auth", framework: "mongodb",
        matched: "Authentication failed",
      };
    }

    if (connectionFailed) {
      return {
        id: this.id, pattern: "MongoDB: Connection Failed",
        explanation: "Can't connect to MongoDB. The server isn't running, the connection string is wrong, or there's a network issue.",
        fixes: [
          { description: "Start MongoDB", command: "mongod", safe: true },
          { description: "Check your connection string in .env", safe: false },
          { description: "If using Docker: docker start mongo", command: "docker start mongo", safe: true },
          { description: "For Atlas: check network access (IP whitelist)", safe: false },
        ],
        confidence: 0.93, category: "database", framework: "mongodb",
        matched: input.match(/ECONNREFUSED.*27017|MongoNetworkError|failed to connect/)![0],
      };
    }

    if (validationError) {
      const field = extractGroup(input, /Path `(\w+)`/);
      return {
        id: this.id, pattern: "Mongoose: Validation Error",
        explanation: `Mongoose validation failed${field ? ` on field "${field}"` : ""}. The document doesn't match the schema.`,
        fixes: [
          { description: "Check required fields are provided", safe: false },
          { description: "Validate data types match the schema definition", safe: false },
          { description: "Check enum values and min/max constraints", safe: false },
        ],
        confidence: 0.9, category: "database", framework: "mongodb",
        matched: input.match(/validation|ValidationError/)![0],
      };
    }

    return {
      id: this.id, pattern: "MongoDB Error",
      explanation: "MongoDB error. Check the error code and message for details.",
      fixes: [
        { description: "Check MongoDB documentation for the specific error", safe: false },
      ],
      confidence: 0.5, category: "database", framework: "mongodb",
      matched: input.match(/MongoError|MongoServerError/)![0],
    };
  },
};

export const postgresError: Matcher = {
  id: "postgres-error",
  name: "PostgreSQL Error",
  frameworks: ["postgres"],
  test: (input) => /SQLSTATE|PostgresError|relation ".*" does not exist|column ".*" does not exist|pg_/.test(input),
  match(input) {
    const relationNotExist = extractGroup(input, /relation "(\w+)" does not exist/);
    const columnNotExist = extractGroup(input, /column "(\w+)" does not exist/);
    const syntaxError = /syntax error at or near/.test(input);

    if (relationNotExist) {
      return {
        id: this.id, pattern: "PostgreSQL: relation does not exist",
        explanation: `Table "${relationNotExist}" doesn't exist in the database. The table hasn't been created, or the name is wrong.`,
        fixes: [
          { description: "Run migrations to create the table", safe: false },
          { description: "Check table name for case sensitivity (PostgreSQL lowercases unquoted names)", safe: false },
          { description: "Check you're connected to the correct database", safe: false },
        ],
        confidence: 0.93, category: "database", framework: "postgres",
        matched: `relation "${relationNotExist}" does not exist`,
      };
    }

    if (columnNotExist) {
      return {
        id: this.id, pattern: "PostgreSQL: column does not exist",
        explanation: `Column "${columnNotExist}" doesn't exist. The column name is wrong or the migration hasn't been run.`,
        fixes: [
          { description: "Check column name spelling and case", safe: false },
          { description: "Run pending migrations", safe: false },
          { description: "Use double quotes for case-sensitive column names", safe: false },
        ],
        confidence: 0.93, category: "database", framework: "postgres",
        matched: `column "${columnNotExist}" does not exist`,
      };
    }

    if (syntaxError) {
      const near = extractGroup(input, /syntax error at or near "(\w+)"/);
      return {
        id: this.id, pattern: "PostgreSQL: syntax error",
        explanation: `SQL syntax error${near ? ` near "${near}"` : ""}. Check your query syntax.`,
        fixes: [
          { description: "Check SQL syntax — look for missing commas, quotes, or keywords", safe: false },
          { description: "Use parameterized queries to avoid syntax issues from string interpolation", safe: false },
        ],
        confidence: 0.85, category: "database", framework: "postgres",
        matched: input.match(/syntax error at or near/)![0],
      };
    }

    return {
      id: this.id, pattern: "PostgreSQL Error",
      explanation: "PostgreSQL error. Check the SQLSTATE code for details.",
      fixes: [{ description: "Check PostgreSQL error codes documentation", safe: false }],
      confidence: 0.5, category: "database", framework: "postgres",
      matched: input.match(/SQLSTATE|PostgresError|pg_/)![0],
    };
  },
};
