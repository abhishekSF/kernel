import { describe, it, expect } from "vitest";
import { normalize, matchProject } from "./witness-core.js";

const whitelist = [
  { id: "gpt", name: "ChatGPT thread", url: "https://chatgpt.com/c/abc" },
  { id: "repo", name: "Repo", url: "https://github.com/acme/kernel" },
  { id: "host", name: "Whole host", url: "https://example.com" },
];

describe("normalize", () => {
  it("strips a leading www, lowercases the host, drops trailing slashes", () => {
    expect(normalize("https://WWW.Example.com/a/b/")).toEqual({
      host: "example.com",
      path: "/a/b",
    });
  });

  it("returns an empty path for the root", () => {
    expect(normalize("https://example.com")).toEqual({ host: "example.com", path: "" });
  });

  it("rejects non-http(s) protocols", () => {
    expect(normalize("chrome://extensions")).toBeNull();
    expect(normalize("file:///tmp/x")).toBeNull();
  });

  it("returns null on an unparseable URL", () => {
    expect(normalize("not a url")).toBeNull();
  });
});

describe("matchProject", () => {
  it("matches the exact enrolled path", () => {
    expect(matchProject(whitelist, "https://chatgpt.com/c/abc")).toBe("gpt");
  });

  it("matches deeper paths on a segment boundary", () => {
    expect(matchProject(whitelist, "https://chatgpt.com/c/abc/edit")).toBe("gpt");
  });

  it("does not match a sibling path that only shares a prefix", () => {
    // the regression: "/c/abc" must not swallow "/c/abcdef"
    expect(matchProject(whitelist, "https://chatgpt.com/c/abcdef")).toBeNull();
  });

  it("ignores www and trailing-slash differences", () => {
    expect(matchProject(whitelist, "https://www.github.com/acme/kernel/")).toBe("repo");
  });

  it("matches any path when the enrolled URL has no path", () => {
    expect(matchProject(whitelist, "https://example.com/anything/here")).toBe("host");
  });

  it("returns null when the host differs", () => {
    expect(matchProject(whitelist, "https://gitlab.com/acme/kernel")).toBeNull();
  });

  it("returns null for an unmatched path or a non-http URL", () => {
    expect(matchProject(whitelist, "https://chatgpt.com/other")).toBeNull();
    expect(matchProject(whitelist, "chrome://newtab")).toBeNull();
  });
});
