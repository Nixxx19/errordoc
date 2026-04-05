import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const pythonModuleNotFound: Matcher = {
  id: "python-module-not-found",
  name: "Python ModuleNotFoundError",
  frameworks: ["python"],
  test: (input) => /ModuleNotFoundError|ImportError|No module named/.test(input),
  match(input) {
    const module = extractGroup(input, /No module named '([^']+)'/);
    const isSubmodule = module?.includes(".");

    return {
      id: this.id,
      pattern: "ModuleNotFoundError",
      explanation: `Python can't find the module "${module ?? "?"}". It's not installed, not in sys.path, or misspelled.`,
      fixes: [
        { description: `Install the package`, command: `pip install ${module?.split(".")[0] ?? module}`, safe: true },
        { description: "If using a virtual environment, make sure it's activated", command: "source venv/bin/activate", safe: false },
        { description: "Check your Python version — use pip3/python3 if needed", command: "python3 --version", safe: true },
        ...(isSubmodule
          ? [{ description: `The parent package might need updating`, command: `pip install --upgrade ${module!.split(".")[0]}`, safe: true }]
          : []),
        { description: "Verify the module name — some packages have different import names (e.g., pip install Pillow, import PIL)", safe: false },
      ],
      confidence: 0.93,
      category: "module",
      framework: "python",
      matched: `No module named '${module}'`,
    };
  },
};

export const pythonSyntaxError: Matcher = {
  id: "python-syntax-error",
  name: "Python SyntaxError",
  frameworks: ["python"],
  test: (input) => /SyntaxError:/.test(input) && /\.py/.test(input),
  match(input) {
    const message = extractGroup(input, /SyntaxError: (.+)/);
    const file = extractGroup(input, /File "([^"]+\.py)"/);
    const line = extractGroup(input, /line (\d+)/);
    const invalidSyntax = /invalid syntax/.test(input);
    const unexpectedEOF = /unexpected EOF/.test(input);
    const unindent = /unexpected unindent|IndentationError/.test(input);

    if (unindent || /IndentationError/.test(input)) {
      return {
        id: this.id,
        pattern: "Python IndentationError",
        explanation: `Indentation error${file ? ` in ${file}` : ""}${line ? ` at line ${line}` : ""}. Python uses indentation to define code blocks — mixing tabs and spaces or incorrect indentation level causes this.`,
        fixes: [
          { description: "Ensure consistent indentation (4 spaces per level is standard)", safe: false },
          { description: "Don't mix tabs and spaces — use spaces only", safe: false },
          { description: "Enable 'show whitespace' in your editor to spot the issue", safe: false },
        ],
        confidence: 0.93,
        category: "syntax",
        framework: "python",
        matched: input.match(/(?:IndentationError|SyntaxError): .+/)![0],
      };
    }

    if (unexpectedEOF) {
      return {
        id: this.id,
        pattern: "Python SyntaxError: unexpected EOF",
        explanation: `Unexpected end of file${file ? ` in ${file}` : ""}. You're missing a closing bracket, parenthesis, or the body of a block statement.`,
        fixes: [
          { description: "Check for unclosed parentheses, brackets, or strings", safe: false },
          { description: "Ensure every def/class/if/for block has at least one statement (use 'pass' as placeholder)", safe: false },
        ],
        confidence: 0.9,
        category: "syntax",
        framework: "python",
        matched: input.match(/SyntaxError: .+/)![0],
      };
    }

    return {
      id: this.id,
      pattern: "Python SyntaxError",
      explanation: `Syntax error${file ? ` in ${file}` : ""}${line ? ` at line ${line}` : ""}: ${message ?? "invalid syntax"}.`,
      fixes: [
        { description: "Check the line indicated and the line before it", safe: false },
        { description: "Look for missing colons after if/def/class/for/while", safe: false },
        { description: "Check for mismatched parentheses, brackets, or quotes", safe: false },
        { description: "If using Python 3 syntax in Python 2 (or vice versa), check your Python version", safe: false },
      ],
      confidence: 0.8,
      category: "syntax",
      framework: "python",
      matched: input.match(/SyntaxError: .+/)![0],
    };
  },
};

export const pythonTypeError: Matcher = {
  id: "python-type-error",
  name: "Python TypeError",
  frameworks: ["python"],
  test: (input) => /TypeError:/.test(input) && /\.py|Traceback/.test(input),
  match(input) {
    const message = extractGroup(input, /TypeError: (.+)/);
    const notCallable = extractGroup(input, /TypeError: '(\w+)' object is not callable/);
    const notSubscriptable = extractGroup(input, /TypeError: '(\w+)' object is not subscriptable/);
    const argCount = /takes \d+ positional argument/.test(input);
    const concatTypes = /can only concatenate|unsupported operand type/.test(input);

    if (notCallable) {
      return {
        id: this.id, pattern: "Python TypeError: not callable",
        explanation: `You're calling a ${notCallable} value like a function using (). It's not a function — you might have overwritten a function name with a variable.`,
        fixes: [
          { description: `Check you haven't reassigned a function name (e.g., list = [1,2,3] shadows the built-in list())`, safe: false },
          { description: "Use type() to check what the value actually is", safe: false },
        ],
        confidence: 0.9, category: "type", framework: "python",
        matched: `TypeError: '${notCallable}' object is not callable`,
      };
    }

    if (notSubscriptable) {
      return {
        id: this.id, pattern: "Python TypeError: not subscriptable",
        explanation: `You're using [] on a ${notSubscriptable}, which doesn't support indexing.`,
        fixes: [
          { description: `Convert to a subscriptable type (list, dict, etc.) first`, safe: false },
          { description: `For type hints in older Python, use 'from __future__ import annotations' or typing module`, safe: false },
        ],
        confidence: 0.9, category: "type", framework: "python",
        matched: `TypeError: '${notSubscriptable}' object is not subscriptable`,
      };
    }

    if (argCount) {
      return {
        id: this.id, pattern: "Python TypeError: wrong argument count",
        explanation: `Function called with wrong number of arguments. ${message}`,
        fixes: [
          { description: "Check the function signature for required parameters", safe: false },
          { description: "For class methods, remember 'self' is counted as a parameter", safe: false },
          { description: "Use keyword arguments to be explicit: func(name='value')", safe: false },
        ],
        confidence: 0.92, category: "type", framework: "python",
        matched: `TypeError: ${message}`,
      };
    }

    if (concatTypes) {
      return {
        id: this.id, pattern: "Python TypeError: type mismatch",
        explanation: `You're trying to combine incompatible types. ${message}`,
        fixes: [
          { description: "Convert types explicitly: str(number), int(string), float(string)", safe: false },
          { description: "Use f-strings for string formatting: f\"{variable}\"", safe: false },
        ],
        confidence: 0.9, category: "type", framework: "python",
        matched: `TypeError: ${message}`,
      };
    }

    return {
      id: this.id, pattern: "Python TypeError",
      explanation: `Type error: ${message ?? "operation on incompatible types"}.`,
      fixes: [
        { description: "Check the types of all values in the expression", safe: false },
        { description: "Use type() to inspect values at runtime", safe: false },
      ],
      confidence: 0.6, category: "type", framework: "python",
      matched: `TypeError: ${message}`,
    };
  },
};

export const pythonKeyError: Matcher = {
  id: "python-key-error",
  name: "Python KeyError",
  frameworks: ["python"],
  test: (input) => /KeyError:/.test(input),
  match(input) {
    const key = extractGroup(input, /KeyError: '?([^'\n]+)'?/);

    return {
      id: this.id,
      pattern: "Python KeyError",
      explanation: `Dictionary key "${key ?? "?"}" doesn't exist. You're accessing a key that isn't in the dictionary.`,
      fixes: [
        { description: `Use .get('${key ?? "key"}', default_value) to avoid the error`, safe: false },
        { description: `Check if the key exists: if '${key ?? "key"}' in dict:`, safe: false },
        { description: "Use collections.defaultdict for automatic defaults", safe: false },
        { description: "Print dict.keys() to see what keys are available", safe: false },
      ],
      confidence: 0.92,
      category: "runtime",
      framework: "python",
      matched: `KeyError: '${key}'`,
    };
  },
};

export const pythonAttributeError: Matcher = {
  id: "python-attribute-error",
  name: "Python AttributeError",
  frameworks: ["python"],
  test: (input) => /AttributeError:/.test(input),
  match(input) {
    const type = extractGroup(input, /AttributeError: '(\w+)' object/);
    const attr = extractGroup(input, /has no attribute '(\w+)'/);
    const isNone = type === "NoneType";

    if (isNone) {
      return {
        id: this.id, pattern: "Python AttributeError: NoneType",
        explanation: `You're calling .${attr ?? "method"} on None. A function probably returned None instead of the expected value — check the return value of the previous call.`,
        fixes: [
          { description: "Check if the variable is None before accessing attributes", safe: false },
          { description: "A function returned None — add explicit return statements", safe: false },
          { description: "Note: list.sort(), list.append() etc. return None (they modify in-place)", safe: false },
        ],
        confidence: 0.93, category: "runtime", framework: "python",
        matched: `AttributeError: 'NoneType' object has no attribute '${attr}'`,
      };
    }

    return {
      id: this.id, pattern: "Python AttributeError",
      explanation: `Object of type '${type ?? "?"}' has no attribute '${attr ?? "?"}'. The method/property doesn't exist on this type.`,
      fixes: [
        { description: `Check spelling of '${attr ?? "attribute"}' — use dir(obj) to see available attributes`, safe: false },
        { description: "Verify you're working with the right type: print(type(obj))", safe: false },
        { description: "The API may have changed in a newer version of the library", safe: false },
      ],
      confidence: 0.88, category: "runtime", framework: "python",
      matched: `AttributeError: '${type}' object has no attribute '${attr}'`,
    };
  },
};

export const pythonValueError: Matcher = {
  id: "python-value-error",
  name: "Python ValueError",
  frameworks: ["python"],
  test: (input) => /ValueError:/.test(input) && /\.py|Traceback/.test(input),
  match(input) {
    const message = extractGroup(input, /ValueError: (.+)/);
    const tooManyValues = /too many values to unpack/.test(input);
    const notEnoughValues = /not enough values to unpack/.test(input);
    const invalidLiteral = /invalid literal for int/.test(input);

    if (tooManyValues || notEnoughValues) {
      return {
        id: this.id, pattern: "Python ValueError: unpack mismatch",
        explanation: `Destructuring mismatch — ${tooManyValues ? "too many" : "not enough"} values to unpack. The number of variables on the left doesn't match the values on the right.`,
        fixes: [
          { description: "Check the length of the iterable you're unpacking", safe: false },
          { description: "Use * to capture remaining values: a, *rest = iterable", safe: false },
        ],
        confidence: 0.92, category: "runtime", framework: "python",
        matched: `ValueError: ${message}`,
      };
    }

    if (invalidLiteral) {
      return {
        id: this.id, pattern: "Python ValueError: invalid literal",
        explanation: `Can't convert a string to a number. The string contains non-numeric characters. ${message}`,
        fixes: [
          { description: "Strip whitespace first: int(string.strip())", safe: false },
          { description: "Check the string value — it may contain letters or special characters", safe: false },
          { description: "Use try/except to handle invalid input gracefully", safe: false },
        ],
        confidence: 0.9, category: "runtime", framework: "python",
        matched: `ValueError: ${message}`,
      };
    }

    return {
      id: this.id, pattern: "Python ValueError",
      explanation: `Value error: ${message ?? "invalid value"}.`,
      fixes: [
        { description: "Check that input values are in the expected range/format", safe: false },
      ],
      confidence: 0.6, category: "runtime", framework: "python",
      matched: `ValueError: ${message}`,
    };
  },
};
