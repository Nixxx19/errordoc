import { analyze } from "./engine.js";
import { formatText, formatJson, formatMarkdown } from "./formatter.js";
import { PATTERN_COUNT } from "./matchers/index.js";
import { execSync } from "child_process";
import * as readline from "readline";

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
  errordoc — turn cryptic errors into plain-English explanations

  Usage:
    command 2>&1 | errordoc          Pipe error output
    errordoc "error message"         Pass error as argument
    errordoc fix "error message"     Analyze and offer to run safe fixes
    command 2>&1 | errordoc fix      Pipe error + offer to run safe fixes
    errordoc --watch                 Watch stdin continuously
    errordoc --stats                 Show matcher statistics

  Options:
    -f, --format <type>     Output format: text (default), json, markdown
    -n, --max <number>      Max results (default: 5)
    -c, --confidence <0-1>  Min confidence threshold (default: 0.3)
    --no-color              Disable colored output
    --watch                 Continuously read from stdin
    --stats                 Show pattern coverage statistics
    -h, --help              Show this help
    -v, --version           Show version

  Examples:
    npm run build 2>&1 | errordoc
    errordoc "Cannot find module 'express'"
    errordoc --format json < error.log
    cargo build 2>&1 | errordoc --format markdown
`);
}

function printVersion() {
  console.log("errordoc v0.1.0");
}

function printStats() {
  console.log(`\n  errordoc pattern coverage\n`);
  console.log(`  Total matchers: ${PATTERN_COUNT}`);
  console.log(`
  Languages:     Node.js, TypeScript, Python, Rust, Go
  Frameworks:    React, Next.js, Vite, Webpack, ESLint
  Databases:     PostgreSQL, MongoDB, Prisma
  Tools:         Docker, Git
  Categories:    module, syntax, type, runtime, network,
                 permission, memory, build, config, database,
                 auth, async, dependency, environment
`);
}

function parseArgs(args: string[]) {
  const opts = {
    format: "text" as "text" | "json" | "markdown",
    maxResults: 5,
    minConfidence: 0.3,
    noColor: false,
    watch: false,
    help: false,
    version: false,
    stats: false,
    input: [] as string[],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "-h":
      case "--help":
        opts.help = true;
        break;
      case "-v":
      case "--version":
        opts.version = true;
        break;
      case "-f":
      case "--format":
        opts.format = (args[++i] ?? "text") as typeof opts.format;
        break;
      case "-n":
      case "--max":
        opts.maxResults = parseInt(args[++i] ?? "5", 10);
        break;
      case "-c":
      case "--confidence":
        opts.minConfidence = parseFloat(args[++i] ?? "0.3");
        break;
      case "--no-color":
        opts.noColor = true;
        break;
      case "--watch":
        opts.watch = true;
        break;
      case "--stats":
        opts.stats = true;
        break;
      default:
        if (!arg.startsWith("-")) {
          opts.input.push(arg);
        }
    }
  }
  return opts;
}

function processInput(input: string, opts: ReturnType<typeof parseArgs>) {
  if (!input.trim()) return;

  const result = analyze(input, {
    maxResults: opts.maxResults,
    minConfidence: opts.minConfidence,
  });

  const useColor = !opts.noColor && process.stdout.isTTY !== false;

  switch (opts.format) {
    case "json":
      console.log(formatJson(result));
      break;
    case "markdown":
      console.log(formatMarkdown(result));
      break;
    default:
      console.log(formatText(result, useColor));
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function watchStdin(opts: ReturnType<typeof parseArgs>) {
  process.stdin.setEncoding("utf-8");
  let buffer = "";

  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.trim()) {
        processInput(line, opts);
      }
    }
  });

  process.stdin.on("end", () => {
    if (buffer.trim()) {
      processInput(buffer, opts);
    }
  });
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function fixMode(rawArgs: string[]) {
  // Args after "fix" — strip flags and treat the rest as error input
  const opts = parseArgs(rawArgs);
  let input = "";

  if (opts.input.length > 0) {
    input = opts.input.join(" ");
  } else if (!process.stdin.isTTY) {
    input = await readStdin();
  } else {
    console.error("errordoc fix: no error input provided");
    process.exit(1);
  }

  if (!input.trim()) {
    console.error("errordoc fix: empty input");
    process.exit(1);
  }

  const result = analyze(input, {
    maxResults: opts.maxResults,
    minConfidence: opts.minConfidence,
  });

  const useColor = !opts.noColor && process.stdout.isTTY !== false;

  // Show matches (same as normal mode)
  switch (opts.format) {
    case "json":
      console.log(formatJson(result));
      break;
    case "markdown":
      console.log(formatMarkdown(result));
      break;
    default:
      console.log(formatText(result, useColor));
  }

  if (result.matches.length === 0) {
    return;
  }

  // Iterate through fixes that have commands
  for (const match of result.matches) {
    for (const fix of match.fixes) {
      if (!fix.command) continue;

      if (!fix.safe) {
        console.log(`\n  ⚠  ${fix.description}`);
        console.log(`     $ ${fix.command}`);
        console.log(`     (manual fix — not auto-runnable)\n`);
        continue;
      }

      const answer = await prompt(`\n  Run \`${fix.command}\`? (y/n) `);
      if (answer === "y" || answer === "yes") {
        try {
          const output = execSync(fix.command, {
            encoding: "utf-8",
            stdio: ["inherit", "pipe", "pipe"],
          });
          if (output.trim()) {
            console.log(output);
          }
          console.log("  ✔ Done.");
        } catch (err: any) {
          console.error(`  ✖ Command failed:`);
          if (err.stderr) console.error(err.stderr);
          if (err.stdout) console.log(err.stdout);
        }
      } else {
        console.log("  Skipped.");
      }
    }
  }
}

async function main() {
  // Check for "fix" subcommand
  if (args[0] === "fix") {
    await fixMode(args.slice(1));
    return;
  }

  const opts = parseArgs(args);

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.version) {
    printVersion();
    process.exit(0);
  }

  if (opts.stats) {
    printStats();
    process.exit(0);
  }

  // Input from arguments
  if (opts.input.length > 0) {
    processInput(opts.input.join(" "), opts);
    process.exit(0);
  }

  // Input from stdin (piped)
  if (!process.stdin.isTTY) {
    if (opts.watch) {
      await watchStdin(opts);
    } else {
      const input = await readStdin();
      processInput(input, opts);
    }
    return;
  }

  // No input — show help
  printHelp();
}

main().catch((err) => {
  console.error("errordoc error:", err);
  process.exit(1);
});
