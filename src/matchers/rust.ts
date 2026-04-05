import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const rustBorrowError: Matcher = {
  id: "rust-borrow",
  name: "Rust Borrow Checker Error",
  frameworks: ["rust"],
  test: (input) => /error\[E0505\]|error\[E0502\]|error\[E0382\]|cannot borrow|value used.*after.*move/.test(input),
  match(input) {
    const code = extractGroup(input, /error\[(E\d{4})\]/);
    const varName = extractGroup(input, /`(\w+)` (?:was moved|cannot borrow|does not live)/);

    const borrowErrors: Record<string, { explanation: string; fixes: string[] }> = {
      E0382: {
        explanation: `Value${varName ? ` "${varName}"` : ""} was moved and can't be used again. In Rust, values have a single owner — when you pass a value to a function or assign it, the original variable is invalidated.`,
        fixes: [
          "Use .clone() to make a copy before the move",
          "Pass a reference (&value) instead of the value itself",
          "Restructure code to use the value only once",
          "Implement Copy trait on the type if it's small",
        ],
      },
      E0502: {
        explanation: `Can't borrow${varName ? ` "${varName}"` : ""} as mutable because it's already borrowed as immutable. You can have many &ref OR one &mut ref, but not both at the same time.`,
        fixes: [
          "Limit the scope of the immutable borrow so it ends before the mutable borrow",
          "Clone the data if the borrows must overlap",
          "Use RefCell for interior mutability (runtime borrow checking)",
        ],
      },
      E0505: {
        explanation: `Can't move${varName ? ` "${varName}"` : ""} because it's borrowed. Something still has a reference to this value.`,
        fixes: [
          "Ensure all borrows end (go out of scope) before the move",
          "Use scoping braces { } to limit borrow lifetimes",
          "Use Rc/Arc for shared ownership",
        ],
      },
    };

    const known = code ? borrowErrors[code] : undefined;

    return {
      id: this.id,
      pattern: `Rust ${code ?? "borrow error"}`,
      explanation: known?.explanation ?? `Borrow checker error: ${varName ?? "a value"} is used incorrectly with Rust's ownership rules.`,
      fixes: (known?.fixes ?? [
        "Check ownership and borrowing rules",
        "Use .clone() as a quick fix, then optimize",
        "Run 'cargo clippy' for suggestions",
      ]).map((f) => ({ description: f, safe: false })),
      confidence: 0.9,
      category: "type",
      framework: "rust",
      matched: input.match(/error\[E\d{4}\].*/)![0],
      docsUrl: code ? `https://doc.rust-lang.org/error_codes/${code}.html` : undefined,
    };
  },
};

export const rustLifetimeError: Matcher = {
  id: "rust-lifetime",
  name: "Rust Lifetime Error",
  frameworks: ["rust"],
  test: (input) => /error\[E0106\]|error\[E0621\]|missing lifetime|lifetime.*may not live long enough/.test(input),
  match(input) {
    const code = extractGroup(input, /error\[(E\d{4})\]/);

    return {
      id: this.id,
      pattern: `Rust lifetime error`,
      explanation: "Lifetime annotation error. Rust needs to know how long references live to guarantee memory safety. When functions return references, you must annotate lifetimes.",
      fixes: [
        { description: "Add lifetime annotations: fn foo<'a>(x: &'a str) -> &'a str", safe: false },
        { description: "Return an owned value (String instead of &str) to avoid lifetimes", safe: false },
        { description: "Use 'static lifetime if the data lives for the entire program", safe: false },
        { description: "Run 'cargo clippy' for suggestions", command: "cargo clippy", safe: true },
      ],
      confidence: 0.88,
      category: "type",
      framework: "rust",
      matched: input.match(/error\[E\d{4}\].*|lifetime.*/)![0],
      docsUrl: code ? `https://doc.rust-lang.org/error_codes/${code}.html` : undefined,
    };
  },
};

export const rustTraitError: Matcher = {
  id: "rust-trait",
  name: "Rust Trait Error",
  frameworks: ["rust"],
  test: (input) => /error\[E0277\]|doesn't implement|the trait.*is not implemented/.test(input),
  match(input) {
    const trait_ = extractGroup(input, /the trait `(\w+)`/);
    const type_ = extractGroup(input, /for.*`(\w+)`/);

    return {
      id: this.id,
      pattern: `Rust: trait not implemented`,
      explanation: `Type${type_ ? ` "${type_}"` : ""} doesn't implement the ${trait_ ?? "required"} trait. The function or context requires this trait bound.`,
      fixes: [
        { description: `Add #[derive(${trait_ ?? "TraitName"})] to your struct if possible`, safe: false },
        { description: `Implement the trait manually: impl ${trait_ ?? "Trait"} for ${type_ ?? "Type"} { ... }`, safe: false },
        { description: "Check if you need to use a wrapper type or conversion", safe: false },
      ],
      confidence: 0.88,
      category: "type",
      framework: "rust",
      matched: input.match(/the trait.*is not implemented|doesn't implement/)![0],
    };
  },
};

export const rustCargoError: Matcher = {
  id: "rust-cargo",
  name: "Rust Cargo Error",
  frameworks: ["rust"],
  test: (input) => /error.*could not compile|cargo.*failed|no matching package named/.test(input),
  match(input) {
    const pkgNotFound = extractGroup(input, /no matching package named `([^`]+)`/);
    const compileFail = extractGroup(input, /could not compile `([^`]+)`/);

    if (pkgNotFound) {
      return {
        id: this.id,
        pattern: "Cargo: package not found",
        explanation: `Crate "${pkgNotFound}" doesn't exist on crates.io or is misspelled.`,
        fixes: [
          { description: `Search for the correct name on crates.io`, safe: false },
          { description: "Check for typos in Cargo.toml", safe: false },
          { description: "If it's a git dependency, check the URL and branch", safe: false },
        ],
        confidence: 0.92,
        category: "dependency",
        framework: "rust",
        matched: `no matching package named \`${pkgNotFound}\``,
      };
    }

    return {
      id: this.id,
      pattern: "Cargo: compilation failed",
      explanation: `Crate${compileFail ? ` "${compileFail}"` : ""} failed to compile. Check the errors above.`,
      fixes: [
        { description: "Fix the compiler errors listed above", safe: false },
        { description: "Run cargo check for faster feedback", command: "cargo check", safe: true },
        { description: "Run cargo clippy for suggestions", command: "cargo clippy", safe: true },
      ],
      confidence: 0.7,
      category: "build",
      framework: "rust",
      matched: input.match(/could not compile|cargo.*failed/)![0],
    };
  },
};
