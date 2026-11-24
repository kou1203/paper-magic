"use client";

import { useCallback, useState } from "react";
import { buttonClassName } from "@/components/ui/Button";
import type { Category } from "@/lib/expenses/queries";
import { ExpenseDialog } from "./ExpenseDialog";

export function AddExpenseButton({ categories, defaultDate }: { categories: Category[]; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClassName("primary")}>
        ＋ 手入力で追加
      </button>
      <ExpenseDialog open={open} onClose={close} categories={categories} defaultDate={defaultDate} />
    </>
  );
}
