/** Extract a value from a regex match group, with fallback */
export function extractGroup(
  input: string,
  pattern: RegExp,
  group = 1
): string | null {
  const match = input.match(pattern);
  return match?.[group] ?? null;
}

/** Extract all occurrences of a pattern */
export function extractAll(input: string, pattern: RegExp): string[] {
  const results: string[] = [];
  const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = global.exec(input)) !== null) {
    results.push(m[1] ?? m[0]);
  }
  return results;
}

/** Detect the framework from error output */
export function detectFrameworks(input: string): string[] {
  const frameworks: string[] = [];
  const checks: [string, RegExp[]][] = [
    ["react", [/react-dom/, /React\.createElement/, /JSX/, /use[A-Z]\w+/]],
    ["nextjs", [/next\//, /Next\.js/, /getServerSideProps/, /getStaticProps/, /next\.config/]],
    ["vite", [/vite/, /Vite/]],
    ["webpack", [/webpack/, /Module build failed/]],
    ["express", [/express/, /Cannot (GET|POST|PUT|DELETE|PATCH)/]],
    ["prisma", [/prisma/, /PrismaClient/]],
    ["typescript", [/\.ts:/, /\.tsx:/, /TS\d{4}:/]],
    ["node", [/node:/, /at Module\._/, /at Object\.<anonymous>/]],
    ["python", [/Traceback \(most recent call last\)/, /\.py"?, line \d+/, /ModuleNotFoundError/, /ImportError/]],
    ["rust", [/error\[E\d+\]/, /cargo/, /rustc/]],
    ["go", [/\.go:\d+/, /go build/, /go run/]],
    ["docker", [/docker/, /Dockerfile/, /container/]],
    ["jest", [/jest/, /FAIL\s+.*\.test\./]],
    ["vitest", [/vitest/, /FAIL\s+.*\.test\./]],
    ["eslint", [/eslint/, /\d+:\d+\s+error\s+/]],
    ["mongodb", [/MongoError/, /MongoServerError/, /mongoose/]],
    ["postgres", [/PostgresError/, /pg_/, /SQLSTATE/]],
    ["redis", [/Redis/, /ECONNREFUSED.*6379/]],
    ["aws", [/AWS/, /AccessDenied.*S3/, /Lambda/]],
    ["firebase", [/firebase/, /FirebaseError/]],
    ["fastapi", [/fastapi/, /uvicorn/]],
    ["django", [/django/, /ImproperlyConfigured/]],
    ["flask", [/flask/, /werkzeug/]],
  ];

  for (const [name, patterns] of checks) {
    if (patterns.some((p) => p.test(input))) {
      frameworks.push(name);
    }
  }
  return frameworks;
}

/** Clean ANSI escape codes from terminal output */
export function stripAnsi(input: string): string {
  return input.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}
