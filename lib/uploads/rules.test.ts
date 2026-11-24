import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  checkFile,
  dropzoneAccept,
  extensionOf,
  extensionsLabel,
  storagePathFor,
} from "./rules";

const file = (name: string, type: string, size = 1000) => ({ name, type, size });

describe("checkFile: statements", () => {
  it.each([
    ["2024-06-expense.csv", "text/csv"],
    ["明細.CSV", "application/vnd.ms-excel"],
    ["export.csv", ""],
    ["card.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ])("accepts %s (%s)", (name, type) => {
    const result = checkFile(file(name, type), "statement");
    expect(result.ok).toBe(true);
  });

  it("maps CSV to the csv kind and a bucket-allowed content type", () => {
    expect(checkFile(file("a.csv", ""), "statement")).toEqual({
      ok: true,
      kind: "csv",
      extension: "csv",
      contentType: "text/csv",
    });
  });

  it("rejects receipts dropped into the statement zone", () => {
    const result = checkFile(file("receipt.jpg", "image/jpeg"), "statement");
    expect(result).toEqual({ ok: false, reason: "対応していない形式です（.csv / .xlsx）" });
  });
});

describe("checkFile: receipts", () => {
  it.each([
    ["receipt_01_cafe.jpg", "image/jpeg", "image"],
    ["scan.JPEG", "image/jpeg", "image"],
    ["photo.png", "image/png", "image"],
    ["invoice.pdf", "application/pdf", "pdf"],
  ])("accepts %s as %s", (name, type, kind) => {
    const result = checkFile(file(name, type), "receipt");
    expect(result.ok && result.kind).toBe(kind);
  });

  it.each([
    ["evil.svg", "image/svg+xml", "対応していない形式"],
    ["page.html", "text/html", "対応していない形式"],
    ["noext", "", "対応していない形式"],
    [".jpg", "image/jpeg", "対応していない形式"],
    ["fake.jpg", "text/html", "一致しません"],
    ["fake.pdf", "", "一致しません"],
  ])("rejects %s", (name, type, reason) => {
    const result = checkFile(file(name, type), "receipt");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain(reason);
  });
});

describe("checkFile: size and name", () => {
  it("allows exactly 10 MB and rejects one byte more", () => {
    expect(checkFile(file("a.png", "image/png", MAX_FILE_BYTES), "receipt").ok).toBe(true);
    const over = checkFile(file("a.png", "image/png", MAX_FILE_BYTES + 1), "receipt");
    expect(over).toEqual({ ok: false, reason: "ファイルサイズが10MBを超えています" });
  });

  it("rejects empty files and bogus sizes", () => {
    expect(checkFile(file("a.png", "image/png", 0), "receipt").ok).toBe(false);
    expect(checkFile(file("a.png", "image/png", -1), "receipt").ok).toBe(false);
    expect(checkFile(file("a.png", "image/png", Number.NaN), "receipt").ok).toBe(false);
  });

  it("rejects names longer than the database allows", () => {
    expect(checkFile(file(`${"a".repeat(252)}.png`, "image/png"), "receipt").ok).toBe(false);
  });
});

describe("helpers", () => {
  it("lower-cases the last extension only", () => {
    expect(extensionOf("archive.tar.CSV")).toBe("csv");
    expect(extensionOf("README")).toBe("");
  });

  it("builds an ASCII storage path in the owner's folder", () => {
    expect(storagePathFor("u-1", "up-2", "csv")).toBe("u-1/up-2/original.csv");
  });

  it("describes extensions without the jpeg alias", () => {
    expect(extensionsLabel("receipt")).toBe(".jpg / .png / .pdf");
  });

  it("builds a dropzone accept map without empty MIME types", () => {
    const accept = dropzoneAccept("statement");
    expect(accept["text/csv"]).toEqual([".csv"]);
    expect(accept[""]).toBeUndefined();
    expect(dropzoneAccept("receipt")["image/jpeg"]).toEqual([".jpg", ".jpeg"]);
  });
});
