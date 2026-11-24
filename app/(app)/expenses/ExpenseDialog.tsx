"use client";

import { useActionState, useEffect, useId, useRef, type ReactNode } from "react";
import { buttonClassName } from "@/components/ui/Button";
import { TAX_TYPE_LABELS } from "@/lib/expenses/csv";
import { TAX_TYPES, type ExpenseField } from "@/lib/expenses/validation";
import type { Category, ExpenseRow } from "@/lib/expenses/queries";
import { createExpense, updateExpense, type ExpenseFormState } from "./actions";

type ExpenseDialogProps = {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  /** The expense to edit; omit to add a new one. */
  expense?: ExpenseRow;
  /** Date pre-filled when adding (YYYY-MM-DD). */
  defaultDate?: string;
};

/** Modal form for adding or editing an expense. */
export function ExpenseDialog({ open, onClose, categories, expense, defaultDate }: ExpenseDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-full max-w-lg border border-line bg-white p-0 text-ink shadow-[0_24px_48px_-28px_rgba(16,35,60,0.45)] backdrop:bg-navy/40"
    >
      {open ? (
        // Mounted only while open, so each opening starts from a fresh form state.
        <ExpenseForm
          titleId={titleId}
          categories={categories}
          expense={expense}
          defaultDate={defaultDate}
          onDone={onClose}
        />
      ) : null}
    </dialog>
  );
}

const INPUT =
  "w-full border border-line bg-paper px-3 py-2 text-sm text-ink focus-visible:border-primary focus-visible:outline-none aria-[invalid=true]:border-ink";

function ExpenseForm({
  titleId,
  categories,
  expense,
  defaultDate,
  onDone,
}: {
  titleId: string;
  categories: Category[];
  expense?: ExpenseRow;
  defaultDate?: string;
  onDone: () => void;
}) {
  const action = expense ? updateExpense.bind(null, expense.id) : createExpense;
  const [state, formAction, pending] = useActionState<ExpenseFormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const baseId = useId();
  const idFor = (field: ExpenseField) => `${baseId}-${field}`;

  useEffect(() => {
    if (state.ok) {
      onDone();
      return;
    }
    // Move focus to the first invalid field in on-screen order.
    if (state.fieldErrors) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state, onDone]);

  const field = (name: ExpenseField, label: string, input: ReactNode, hint?: string) => {
    const error = state.fieldErrors?.[name];
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idFor(name)} className="flex items-baseline gap-2 text-[12.5px] tracking-[0.1em] text-muted">
          {label}
          {hint ? <span className="text-[11px] tracking-normal">{hint}</span> : null}
        </label>
        {input}
        {error ? (
          <p id={`${idFor(name)}-error`} className="text-xs font-semibold text-ink">
            {error}
          </p>
        ) : null}
      </div>
    );
  };
  const aria = (name: ExpenseField) => ({
    id: idFor(name),
    name,
    "aria-invalid": Boolean(state.fieldErrors?.[name]),
    "aria-describedby": state.fieldErrors?.[name] ? `${idFor(name)}-error` : undefined,
  });

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-4 px-7 pt-6 pb-7">
      <h2 id={titleId} className="font-serif text-lg font-bold tracking-[0.06em]">
        {expense ? "経費を編集" : "手入力で追加"}
      </h2>
      {state.error ? (
        <p role="alert" className="border border-ink bg-canvas px-3 py-2.5 text-[12.5px]">
          {state.error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        {field(
          "date",
          "日付",
          <input type="date" required defaultValue={expense?.date ?? defaultDate} className={`${INPUT} num`} {...aria("date")} />,
        )}
        {field(
          "amountJpy",
          "金額（税込）",
          <input
            type="text"
            inputMode="numeric"
            required
            defaultValue={expense ? String(expense.amount_jpy) : ""}
            placeholder="1,280"
            className={`${INPUT} num text-right`}
            {...aria("amountJpy")}
          />,
          "返金はマイナス",
        )}
      </div>
      {field(
        "description",
        "摘要",
        <input type="text" required maxLength={500} defaultValue={expense?.description ?? ""} className={INPUT} {...aria("description")} />,
      )}
      {field(
        "vendor",
        "店舗・支払先",
        <input type="text" maxLength={200} defaultValue={expense?.vendor ?? ""} className={INPUT} {...aria("vendor")} />,
        "任意",
      )}
      <div className="grid grid-cols-2 gap-4">
        {field(
          "categoryId",
          "勘定科目",
          <select required defaultValue={expense ? String(expense.category_id) : ""} className={INPUT} {...aria("categoryId")}>
            <option value="" disabled>
              選択してください
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>,
        )}
        {field(
          "taxType",
          "税区分",
          <select defaultValue={expense?.tax_type ?? ""} className={INPUT} {...aria("taxType")}>
            <option value="">未設定</option>
            {TAX_TYPES.map((t) => (
              <option key={t} value={t}>
                {TAX_TYPE_LABELS[t]}
              </option>
            ))}
          </select>,
        )}
      </div>

      <div className="mt-2 flex gap-3 border-t border-line pt-5">
        <button type="submit" disabled={pending} className={buttonClassName("primary", "px-7")}>
          {pending ? "保存中…" : expense ? "保存する" : "追加する"}
        </button>
        <button type="button" onClick={onDone} className={buttonClassName("outline")}>
          キャンセル
        </button>
      </div>
    </form>
  );
}
