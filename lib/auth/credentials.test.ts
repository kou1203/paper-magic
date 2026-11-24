import { describe, expect, it } from "vitest";
import { parseCredentials } from "./credentials";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseCredentials", () => {
  it("accepts a valid email and password, trimming the email", () => {
    expect(parseCredentials(form({ email: "  taro@example.com ", password: "password1" }))).toEqual({
      ok: true,
      data: { email: "taro@example.com", password: "password1" },
    });
  });

  it("reports one message per field", () => {
    const result = parseCredentials(form({ email: "not-an-email", password: "short" }));
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        email: "メールアドレスの形式が正しくありません",
        password: "パスワードは8文字以上で入力してください",
      },
    });
  });

  it("treats missing fields as empty", () => {
    const result = parseCredentials(new FormData());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.email).toBe("メールアドレスを入力してください");
      expect(result.fieldErrors.password).toBeDefined();
    }
  });

  it("rejects passwords longer than bcrypt can hash", () => {
    const result = parseCredentials(form({ email: "a@example.com", password: "x".repeat(73) }));
    expect(result.ok).toBe(false);
  });
});
