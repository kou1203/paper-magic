import { z } from "zod";

export const TAX_TYPES = ["standard_10", "reduced_8", "exempt"] as const;

/** Largest amount accepted from the form (fits Postgres integer comfortably). */
export const MAX_AMOUNT_JPY = 1_000_000_000;

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Accepts "1280", "1,280", "¥1,280", "-500" and full-width digits. */
export function parseAmount(raw: string): number | null {
  const normalised = raw
    .normalize("NFKC")
    .replace(/[¥￥,\s円]/g, "")
    .replace(/^−/, "-");
  if (!/^-?\d{1,10}$/.test(normalised)) return null;
  const n = Number(normalised);
  return Number.isSafeInteger(n) ? n : null;
}

export const expenseInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付を YYYY-MM-DD 形式で入力してください")
    .refine(isRealDate, "存在しない日付です")
    .refine((v) => v >= "2000-01-01" && v <= "2099-12-31", "2000年〜2099年の日付を入力してください"),
  description: z.string().trim().min(1, "摘要を入力してください").max(500, "摘要は500文字以内で入力してください"),
  vendor: z
    .string()
    .trim()
    .max(200, "店舗名は200文字以内で入力してください")
    .transform((v) => (v === "" ? null : v)),
  categoryId: z.coerce.number().int().positive("勘定科目を選択してください"),
  amountJpy: z
    .string()
    .transform((v, ctx) => {
      const n = parseAmount(v);
      if (n === null) {
        ctx.addIssue({ code: "custom", message: "金額は整数で入力してください" });
        return z.NEVER;
      }
      return n;
    })
    .refine((n) => n !== 0, "0円は登録できません")
    .refine((n) => Math.abs(n) <= MAX_AMOUNT_JPY, "金額が大きすぎます"),
  taxType: z
    .enum(["", ...TAX_TYPES], { message: "税区分を選択してください" })
    .transform((v) => (v === "" ? null : v)),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseField = keyof ExpenseInput;
export type ExpenseFieldErrors = Partial<Record<ExpenseField, string>>;

export type ExpenseInputResult =
  | { ok: true; data: ExpenseInput }
  | { ok: false; fieldErrors: ExpenseFieldErrors };

export function parseExpenseInput(formData: FormData): ExpenseInputResult {
  const read = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const parsed = expenseInputSchema.safeParse({
    date: read("date"),
    description: read("description"),
    vendor: read("vendor"),
    categoryId: read("categoryId"),
    amountJpy: read("amountJpy"),
    taxType: read("taxType"),
  });
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: ExpenseFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as ExpenseField;
    fieldErrors[field] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}

const ids = z.array(z.uuid()).min(1).max(100);

/** IDs for bulk actions: 1–100 UUIDs, de-duplicated. */
export function parseIds(value: unknown): string[] | null {
  const parsed = ids.safeParse(value);
  return parsed.success ? [...new Set(parsed.data.map((id) => id.toLowerCase()))] : null;
}
