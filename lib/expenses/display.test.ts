import { describe, expect, it } from "vitest";
import { pageWindow, shortDate } from "./display";

describe("shortDate", () => {
  it("drops the year and leading zeros", () => {
    expect(shortDate("2024-06-24")).toBe("6/24");
    expect(shortDate("2024-01-05")).toBe("1/5");
  });

  it("rejects other formats", () => {
    expect(() => shortDate("2024/06/24")).toThrow(RangeError);
  });
});

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });

  it("collapses distant pages into gaps", () => {
    expect(pageWindow(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
    expect(pageWindow(1, 12)).toEqual([1, 2, null, 12]);
    expect(pageWindow(12, 12)).toEqual([1, null, 11, 12]);
  });

  it("does not leave a gap of one page", () => {
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
