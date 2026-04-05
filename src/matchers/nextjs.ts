import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const nextServerComponent: Matcher = {
  id: "next-server-component",
  name: "Next.js Server Component Error",
  frameworks: ["nextjs"],
  test: (input) =>
    /You're importing a component that needs|useState|useEffect|createContext.*server/i.test(input) &&
    /server component|"use client"/i.test(input),
  match(input) {
    const hook = extractGroup(input, /(useState|useEffect|useContext|useRef|useReducer|createContext)/);

    return {
      id: this.id,
      pattern: "Next.js: Client hook in Server Component",
      explanation: `You're using ${hook ?? "a client-side hook"} in a Server Component. In Next.js App Router, components are Server Components by default — they can't use React hooks or browser APIs.`,
      fixes: [
        { description: 'Add "use client" at the top of the file', safe: false },
        { description: "Move the interactive logic to a separate Client Component", safe: false },
        { description: "Use Server Actions for form handling instead of client-side state", safe: false },
      ],
      confidence: 0.95,
      category: "runtime",
      framework: "nextjs",
      matched: input.match(/You're importing a component that needs|server component/i)![0],
      docsUrl: "https://nextjs.org/docs/getting-started/react-essentials#client-components",
    };
  },
};

export const nextDynamicServerUsage: Matcher = {
  id: "next-dynamic-server",
  name: "Next.js Dynamic Server Usage",
  frameworks: ["nextjs"],
  test: (input) => /Dynamic server usage|cookies|headers.*static/.test(input),
  match(input) {
    const api = extractGroup(input, /(cookies|headers|searchParams)/);

    return {
      id: this.id,
      pattern: "Next.js: Dynamic server usage in static page",
      explanation: `You're using ${api ?? "a dynamic API"} in a page Next.js is trying to statically generate. Dynamic APIs (cookies, headers, searchParams) force the page to be server-rendered.`,
      fixes: [
        { description: "Add 'export const dynamic = \"force-dynamic\"' to the page", safe: false },
        { description: "Move the dynamic logic to a Server Action or API route", safe: false },
        { description: "Use generateStaticParams() if you want static generation", safe: false },
      ],
      confidence: 0.9,
      category: "build",
      framework: "nextjs",
      matched: input.match(/Dynamic server usage/)![0],
    };
  },
};

export const nextBuildError: Matcher = {
  id: "next-build-error",
  name: "Next.js Build Error",
  frameworks: ["nextjs"],
  test: (input) => /next build.*failed|Build error occurred|Failed to compile/i.test(input),
  match(input) {
    const pageError = extractGroup(input, /Error occurred prerendering page "([^"]+)"/);

    return {
      id: this.id,
      pattern: "Next.js: Build failed",
      explanation: `Next.js build failed${pageError ? ` on page "${pageError}"` : ""}. Check the error above for the specific cause.`,
      fixes: [
        { description: "Run 'next dev' to see the full error with hot reload", command: "npx next dev", safe: true },
        { description: "Check for missing environment variables in production", safe: false },
        { description: "Ensure all dynamic imports have fallbacks", safe: false },
        { description: "Clear the .next cache and rebuild", command: "rm -rf .next && npx next build", safe: true },
      ],
      confidence: 0.7,
      category: "build",
      framework: "nextjs",
      matched: input.match(/Build error occurred|Failed to compile/)![0],
    };
  },
};

export const nextImageError: Matcher = {
  id: "next-image",
  name: "Next.js Image Error",
  frameworks: ["nextjs"],
  test: (input) => /next\/image|Image Optimization|hostname.*not configured/i.test(input),
  match(input) {
    const hostname = extractGroup(input, /hostname "([^"]+)" is not configured/);

    return {
      id: this.id,
      pattern: "Next.js: Image hostname not configured",
      explanation: `The external image hostname${hostname ? ` "${hostname}"` : ""} isn't in your next.config.js. Next.js Image Optimization requires explicit allowlisting of external domains.`,
      fixes: [
        {
          description: `Add the hostname to next.config.js images.remotePatterns`,
          safe: false,
        },
        { description: "Use a regular <img> tag to bypass Image Optimization", safe: false },
      ],
      confidence: 0.92,
      category: "config",
      framework: "nextjs",
      matched: input.match(/hostname.*not configured|Image Optimization/)![0],
      docsUrl: "https://nextjs.org/docs/messages/next-image-unconfigured-host",
    };
  },
};

export const nextNotFound: Matcher = {
  id: "next-404",
  name: "Next.js 404",
  frameworks: ["nextjs"],
  test: (input) => /404|This page could not be found|NEXT_NOT_FOUND/.test(input),
  match(input) {
    const path = extractGroup(input, /404.*?["']?([/][^\s"']+)/);

    return {
      id: this.id,
      pattern: "Next.js: Page not found",
      explanation: `Page${path ? ` "${path}"` : ""} was not found. In the App Router, the file must be at app${path ?? "/..."}/page.tsx. In Pages Router, it must be at pages${path ?? "/..."}.tsx.`,
      fixes: [
        { description: "Check your file is named 'page.tsx' (App Router) or matches the route (Pages Router)", safe: false },
        { description: "Verify the file is in the correct directory", safe: false },
        { description: "Check for typos in the URL and file path", safe: false },
        { description: "Restart the dev server — new routes sometimes need a restart", safe: false },
      ],
      confidence: 0.7,
      category: "runtime",
      framework: "nextjs",
      matched: input.match(/404|This page could not be found/)![0],
    };
  },
};
