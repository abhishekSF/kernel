// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { CSP, serviceWorkerSource } from "./local-first.js";

const ROOT = join(import.meta.dirname, "..");

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    if (!/\.(ts|tsx|js|html)$/.test(name) || /\.test\./.test(name)) return [];
    return [path];
  });
}

const NETWORK_APIS = [
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /sendBeacon/,
  /importScripts/,
  /\bRTCPeerConnection\b/,
];

// A literal host after the scheme. XML namespace identifiers look like URLs
// but are never requested, and `https://${input}` normalises user-typed links.
const REMOTE_URL = /https?:\/\/(?!www\.w3\.org\/)[a-z0-9]/i;

describe("no network code", () => {
  const files = [
    ...sourceFiles(join(ROOT, "src")),
    ...sourceFiles(join(ROOT, "extension")),
    join(ROOT, "index.html"),
  ];

  it("scans a non-trivial set of files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    it(`${relative(ROOT, file)} has no network APIs or remote URLs`, () => {
      const text = readFileSync(file, "utf8");
      for (const api of NETWORK_APIS) expect(text).not.toMatch(api);
      expect(text).not.toMatch(REMOTE_URL);
    });
  }
});

describe("content security policy", () => {
  const directives = Object.fromEntries(
    CSP.split(";").map((d) => {
      const [name, ...values] = d.trim().split(/\s+/);
      return [name, values];
    })
  );

  it("blocks every outgoing connection", () => {
    expect(directives["connect-src"]).toEqual(["'none'"]);
    expect(directives["default-src"]).toEqual(["'none'"]);
    expect(directives["form-action"]).toEqual(["'none'"]);
  });

  it("only allows scripts from Kernel itself", () => {
    expect(directives["script-src"]).toEqual(["'self'"]);
  });

  it("names no remote host anywhere", () => {
    expect(CSP).not.toMatch(/https?:|\*/);
  });
});

describe("service worker", () => {
  const sw = serviceWorkerSource(["assets/index-abc.js", "assets/index-def.css"]);

  it("precaches the built files and the app shell", () => {
    expect(sw).toContain('"assets/index-abc.js"');
    expect(sw).toContain('"assets/index-def.css"');
    expect(sw).toContain('"index.html"');
  });

  it("ignores cross-origin and non-GET requests", () => {
    expect(sw).toContain('if (req.method !== "GET") return;');
    expect(sw).toContain("if (new URL(req.url).origin !== self.location.origin) return;");
  });

  it("changes its cache name when the build changes", () => {
    const other = serviceWorkerSource(["assets/index-xyz.js"]);
    const name = (s) => s.match(/const CACHE = "([^"]+)"/)[1];
    expect(name(sw)).not.toBe(name(other));
  });
});
