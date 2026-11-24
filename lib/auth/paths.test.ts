import { describe, expect, it } from "vitest";
import { HOME_PATH, isPublicPath, loginPathFor, safeNextPath } from "./paths";

describe("isPublicPath", () => {
  it.each(["/login", "/auth/callback", "/auth/callback/extra"])("treats %s as public", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(["/", "/dashboard", "/upload/review", "/loginx", "/auth"])("protects %s", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin paths and their query", () => {
    expect(safeNextPath("/expenses")).toBe("/expenses");
    expect(safeNextPath("/expenses?month=2024-06")).toBe("/expenses?month=2024-06");
  });

  it("returns the normalised path when dot segments stay on this site", () => {
    expect(safeNextPath("/upload/../expenses")).toBe("/expenses");
  });

  it("never returns a protocol-relative path", () => {
    const attempts = ["/..//evil.example", "/%2e%2e//evil.example", "/a/..//evil.example/x"];
    for (const attempt of attempts) {
      const result = safeNextPath(attempt);
      expect(result.startsWith("//")).toBe(false);
      expect(new URL(result, "http://localhost:3000").host).toBe("localhost:3000");
    }
  });

  it.each([
    undefined,
    null,
    "",
    ["/expenses"],
    "expenses",
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "/\t/evil.example",
    "/\n/evil.example",
    "/..//evil.example",
    "/.//evil.example",
    "/%2e%2e//evil.example",
    "/%2E%2E//evil.example",
    "/a/..//evil.example/x",
    "/a/b/../..//evil.example",
    "/login",
    "/auth/callback?code=x",
    `/${"a".repeat(3000)}`,
  ])("falls back to home for %j", (value) => {
    expect(safeNextPath(value)).toBe(HOME_PATH);
  });
});

describe("loginPathFor", () => {
  it("carries the page to return to", () => {
    expect(loginPathFor("/expenses?month=2024-06")).toBe(
      "/login?next=%2Fexpenses%3Fmonth%3D2024-06",
    );
  });

  it("omits next for the default page", () => {
    expect(loginPathFor("/dashboard")).toBe("/login");
    expect(loginPathFor("/")).toBe("/login?next=%2F");
  });
});
