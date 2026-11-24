"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { parseExpenseInput, parseIds, type ExpenseFieldErrors } from "@/lib/expenses/validation";

export type ExpenseFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: ExpenseFieldErrors;
};

export type BulkResult = { ok: true; affected: number } | { ok: false; error: string };

const SAVE_FAILED = "保存できませんでした。時間をおいてもう一度お試しください。";

/** Postgres foreign-key violation: the chosen category does not exist. */
function isUnknownCategory(error: { code?: string }): boolean {
  return error.code === "23503";
}

/** Adds an expense typed in by hand (source = manual, status = confirmed). */
export async function createExpense(_prev: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  const parsed = parseExpenseInput(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  await getCurrentUser();
  const supabase = await createClient();
  const { date, description, vendor, categoryId, amountJpy, taxType } = parsed.data;
  const { error } = await supabase.from("expenses").insert({
    date,
    description,
    vendor,
    category_id: categoryId,
    amount_jpy: amountJpy,
    tax_type: taxType,
    source: "manual",
    status: "confirmed",
  });
  if (error) {
    if (isUnknownCategory(error)) return { fieldErrors: { categoryId: "勘定科目を選択してください" } };
    console.error("createExpense failed", error);
    return { error: SAVE_FAILED };
  }
  refresh();
  return { ok: true };
}

const idSchema = z.uuid();

/** Edits one expense. Only the fields on the form change. */
export async function updateExpense(
  id: string,
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  if (!idSchema.safeParse(id).success) return { error: "経費を特定できませんでした。" };
  const parsed = parseExpenseInput(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { date, description, vendor, categoryId, amountJpy, taxType } = parsed.data;
  const { data, error } = await supabase
    .from("expenses")
    .update({
      date,
      description,
      vendor,
      category_id: categoryId,
      amount_jpy: amountJpy,
      tax_type: taxType,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    if (isUnknownCategory(error)) return { fieldErrors: { categoryId: "勘定科目を選択してください" } };
    console.error("updateExpense failed", error);
    return { error: SAVE_FAILED };
  }
  if (data.length === 0) return { error: "経費が見つかりませんでした。削除された可能性があります。" };
  refresh();
  return { ok: true };
}

/** Deletes the given expenses (1–100). */
export async function deleteExpenses(ids: unknown): Promise<BulkResult> {
  const valid = parseIds(ids);
  if (!valid) return { ok: false, error: "削除する経費を選択してください。" };

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .in("id", valid)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    console.error("deleteExpenses failed", error);
    return { ok: false, error: "削除できませんでした。時間をおいてもう一度お試しください。" };
  }
  refresh();
  return { ok: true, affected: data.length };
}

const categoryIdSchema = z.number().int().positive();

/** Sets one account category on the given expenses (1–100). */
export async function setExpensesCategory(ids: unknown, categoryId: unknown): Promise<BulkResult> {
  const valid = parseIds(ids);
  const category = categoryIdSchema.safeParse(categoryId);
  if (!valid || !category.success) return { ok: false, error: "経費と勘定科目を選択してください。" };

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({ category_id: category.data })
    .in("id", valid)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    if (isUnknownCategory(error)) return { ok: false, error: "勘定科目を選択してください。" };
    console.error("setExpensesCategory failed", error);
    return { ok: false, error: SAVE_FAILED };
  }
  refresh();
  return { ok: true, affected: data.length };
}
