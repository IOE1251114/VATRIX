import { describe, expect, it } from "vitest";
import { safeNext } from "./safeNext";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/algorithms?mode=student")).toBe(
      "/algorithms?mode=student",
    );
    expect(safeNext("/linear-algebra?topic=la-r3#x")).toBe(
      "/linear-algebra?topic=la-r3#x",
    );
  });
  it("rejects anything that could leave the site", () => {
    for (const bad of [
      null,
      "",
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "evil.com",
      "javascript:alert(1)",
    ])
      expect(safeNext(bad)).toBe("/");
  });
});
