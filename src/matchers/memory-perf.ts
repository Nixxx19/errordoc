import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const nodeHeapOutOfMemory: Matcher = {
  id: "memory-node-heap-oom",
  name: "Node.js Heap Out of Memory",
  frameworks: ["node"],
  test: (input) => /JavaScript heap out of memory|FATAL ERROR.*heap|Reached heap limit/i.test(input),
  match(input) {
    const currentLimit = extractGroup(input, /(\d+)\s*MB/);

    return {
      id: this.id,
      pattern: "JavaScript heap out of memory",
      explanation: `Node.js ran out of heap memory${currentLimit ? ` (limit: ${currentLimit}MB)` : ""}. The default heap limit is ~1.7GB. Large datasets, memory leaks, or build processes can hit this limit.`,
      fixes: [
        { description: "Increase the heap size via --max-old-space-size flag", command: "node --max-old-space-size=4096 your-script.js", safe: false },
        { description: "For npm scripts, set the NODE_OPTIONS env variable", command: "export NODE_OPTIONS='--max-old-space-size=4096'", safe: false },
        { description: "Profile memory usage to find leaks", command: "node --inspect your-script.js", safe: true },
        { description: "Process data in streams/chunks instead of loading everything into memory", safe: false },
        { description: "Check for growing arrays, caches, or event listener leaks in your code", safe: false },
      ],
      confidence: 0.95,
      category: "memory",
      matched: input.match(/JavaScript heap out of memory|FATAL ERROR.*heap|Reached heap limit/i)![0],
    };
  },
};

export const enomem: Matcher = {
  id: "memory-enomem",
  name: "ENOMEM",
  frameworks: ["node"],
  test: (input) => /ENOMEM|Cannot allocate memory|not enough memory/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "ENOMEM: out of memory",
      explanation: "The operating system denied a memory allocation request. The system is running low on both RAM and swap space.",
      fixes: [
        { description: "Check available system memory", command: "free -h", safe: true },
        { description: "Close other memory-intensive applications", safe: false },
        { description: "Add swap space if running on a server with limited RAM", command: "sudo fallocate -l 4G /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile", safe: false },
        { description: "On Docker, increase the container memory limit (--memory flag)", safe: false },
        { description: "Reduce the Node.js heap size if it's set too high for the available RAM", safe: false },
      ],
      confidence: 0.92,
      category: "memory",
      matched: input.match(/ENOMEM|Cannot allocate memory|not enough memory/i)![0],
    };
  },
};

export const workerThreadError: Matcher = {
  id: "memory-worker-thread-error",
  name: "Worker Thread Error",
  frameworks: ["node"],
  test: (input) => /Worker.*(?:error|failed|terminated|exit)|ERR_WORKER_INIT_FAILED|worker_threads/i.test(input),
  match(input) {
    const exitCode = extractGroup(input, /exit code[:\s]+(\d+)/i);

    return {
      id: this.id,
      pattern: "Worker Thread Error",
      explanation: `A Node.js worker thread failed${exitCode ? ` with exit code ${exitCode}` : ""}. The worker may have thrown an unhandled error, run out of memory, or failed to initialize.`,
      fixes: [
        { description: "Add error handling to the worker: worker.on('error', (err) => ...)", safe: false },
        { description: "Check the worker script path is correct and the file exists", safe: false },
        { description: "If sharing memory, ensure SharedArrayBuffer is used correctly", safe: false },
        { description: "Set a resource limit for the worker: new Worker(file, { resourceLimits: { maxOldGenerationSizeMb: 512 } })", safe: false },
      ],
      confidence: 0.85,
      category: "runtime",
      matched: input.match(/Worker.*(?:error|failed|terminated|exit)|ERR_WORKER_INIT_FAILED|worker_threads/i)![0],
    };
  },
};

export const workerOutOfMemory: Matcher = {
  id: "memory-worker-oom",
  name: "Worker Out of Memory",
  frameworks: ["node"],
  test: (input) => /ERR_WORKER_OUT_OF_MEMORY|worker.*out of memory|worker.*heap/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "ERR_WORKER_OUT_OF_MEMORY",
      explanation: "A worker thread ran out of memory. Worker threads have their own V8 heap, which may be smaller than the main thread's heap by default.",
      fixes: [
        { description: "Set resourceLimits when creating the worker: new Worker(file, { resourceLimits: { maxOldGenerationSizeMb: 1024 } })", safe: false },
        { description: "Process data in smaller chunks within the worker", safe: false },
        { description: "Transfer large ArrayBuffers instead of copying: postMessage(data, [data.buffer])", safe: false },
        { description: "Use streaming/pagination for large datasets", safe: false },
      ],
      confidence: 0.93,
      category: "memory",
      matched: input.match(/ERR_WORKER_OUT_OF_MEMORY|worker.*out of memory|worker.*heap/i)![0],
    };
  },
};

export const eventLoopBlocked: Matcher = {
  id: "memory-event-loop-blocked",
  name: "Event Loop Blocked",
  frameworks: ["node"],
  test: (input) => /event loop.*(?:blocked|lag|delay)|blocked.*event loop|--detect-libuv-watcher-leaks|ERR_EVENT_RECURSION|maximum call stack/i.test(input),
  match(input) {
    const delay = extractGroup(input, /(\d+)\s*ms/);

    return {
      id: this.id,
      pattern: "Event Loop Blocked",
      explanation: `The Node.js event loop is blocked or experiencing excessive lag${delay ? ` (${delay}ms delay)` : ""}. This prevents all I/O operations and makes the server unresponsive.`,
      fixes: [
        { description: "Move CPU-intensive work to a worker thread", safe: false },
        { description: "Break up synchronous loops with setImmediate() or process.nextTick()", safe: false },
        { description: "Use async/streaming APIs instead of synchronous fs operations (readFileSync, etc.)", safe: false },
        { description: "Profile the event loop", command: "node --prof your-script.js", safe: true },
        { description: "Use clinic.js to diagnose event loop issues", command: "npx clinic doctor -- node your-script.js", safe: true },
      ],
      confidence: 0.85,
      category: "runtime",
      matched: input.match(/event loop.*(?:blocked|lag|delay)|blocked.*event loop|maximum call stack/i)![0],
    };
  },
};
