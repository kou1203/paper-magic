"use client";

import Link from "next/link";
import { useCallback, useId, useMemo, useState, useTransition } from "react";
import { buttonClassName } from "@/components/ui/Button";
import { SourceTag } from "@/components/ui/SourceTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { shortDate } from "@/lib/expenses/display";
import type { Category, ExpenseRow } from "@/lib/expenses/queries";
import { formatJPY } from "@/lib/format";
import { deleteExpenses, setExpensesCategory } from "./actions";
import { ExpenseDialog } from "./ExpenseDialog";

const HEAD = "py-[11px] text-[11px] font-semibold tracking-[0.12em] text-muted";
const CELL = "py-3 align-middle";

export function ExpensesTable({ rows, categories }: { rows: ExpenseRow[]; categories: Category[] }) {
  const names = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [message, setMessage] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const bulkCategoryId = useId();

  // Drop selections that are no longer on the page (after delete or paging).
  const visibleSelected = useMemo(
    () => new Set(rows.filter((r) => selected.has(r.id)).map((r) => r.id)),
    [rows, selected],
  );
  const allSelected = rows.length > 0 && visibleSelected.size === rows.length;

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const closeEditor = useCallback(() => setEditing(null), []);

  const runBulk = (action: () => Promise<{ ok: true; affected: number } | { ok: false; error: string }>, done: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setSelected(new Set());
        setMessage(`${result.affected}件を${done}しました`);
      } else {
        setMessage(result.error);
      }
    });

  const onBulkDelete = () => {
    const ids = [...visibleSelected];
    if (ids.length === 0) return;
    if (!window.confirm(`選択した${ids.length}件の経費を削除します。元に戻せません。よろしいですか？`)) return;
    runBulk(() => deleteExpenses(ids), "削除");
  };

  const onBulkCategory = (form: FormData) => {
    const ids = [...visibleSelected];
    const categoryId = Number(form.get("categoryId"));
    if (ids.length === 0 || !categoryId) return;
    runBulk(() => setExpensesCategory(ids, categoryId), "更新");
  };

  const onDelete = (row: ExpenseRow) => {
    if (!window.confirm(`「${row.description}」（${formatJPY(row.amount_jpy)}）を削除します。よろしいですか？`)) return;
    runBulk(() => deleteExpenses([row.id]), "削除");
  };

  if (rows.length === 0) {
    return (
      <p className="border-t border-line py-12 text-center text-[13px] tracking-[0.06em] text-muted">
        条件に合う経費はありません。
      </p>
    );
  }

  return (
    <>
      <p role="status" className="sr-only">
        {message}
      </p>
      {visibleSelected.size > 0 ? (
        <form
          action={onBulkCategory}
          aria-label="選択した経費の一括操作"
          className="flex flex-wrap items-center gap-3 border-b border-line bg-primary-soft/60 px-[18px] py-2.5 text-[12.5px]"
        >
          <span className="num font-semibold">{visibleSelected.size}件を選択中</span>
          <label htmlFor={bulkCategoryId} className="ml-2 text-muted">
            勘定科目を
          </label>
          <select
            id={bulkCategoryId}
            name="categoryId"
            required
            defaultValue=""
            className="border border-line bg-white px-2 py-1.5 text-[13px]"
          >
            <option value="" disabled>
              選択
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={pending} className={buttonClassName("outline", "px-3 py-1.5 text-xs")}>
            に変更
          </button>
          <button
            type="button"
            onClick={onBulkDelete}
            disabled={pending}
            className="ml-auto cursor-pointer text-xs text-ink underline underline-offset-2 disabled:opacity-50"
          >
            選択した経費を削除
          </button>
        </form>
      ) : null}

      <table className="w-full table-fixed border-collapse text-[13px]">
        <caption className="sr-only">経費の一覧</caption>
        <colgroup>
          <col className="w-[50px]" />
          <col className="w-[70px]" />
          <col />
          <col className="w-[124px]" />
          <col className="w-[76px]" />
          <col className="w-[118px]" />
          <col className="w-[104px]" />
          <col className="w-[118px]" />
        </colgroup>
        <thead className="bg-paper">
          <tr className="border-b border-line text-left">
            <th scope="col" className={`${HEAD} pl-[18px]`}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="このページの経費をすべて選択"
                className="m-0 accent-primary"
              />
            </th>
            <th scope="col" className={HEAD}>日付</th>
            <th scope="col" className={HEAD}>摘要・店舗</th>
            <th scope="col" className={HEAD}>カテゴリ</th>
            <th scope="col" className={`${HEAD} text-center`}>出典</th>
            <th scope="col" className={`${HEAD} pr-3 text-right`}>金額</th>
            <th scope="col" className={`${HEAD} text-center`}>状態</th>
            <th scope="col" className={`${HEAD} pr-[18px]`}>
              <span className="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const pendingReview = row.status === "pending_review";
            const label = row.vendor ? `${row.description} ── ${row.vendor}` : row.description;
            return (
              <tr
                key={row.id}
                className={["border-b border-canvas", pendingReview ? "bg-primary-soft/35" : ""].join(" ")}
              >
                <td className={`${CELL} pl-[18px]`}>
                  <input
                    type="checkbox"
                    checked={visibleSelected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label={`${shortDate(row.date)} ${row.description} を選択`}
                    className="m-0 accent-primary"
                  />
                </td>
                <td className={`${CELL} num text-muted`}>{shortDate(row.date)}</td>
                <td className={CELL}>
                  <span className="block truncate" title={label}>
                    {label}
                  </span>
                </td>
                <td className={CELL}>
                  <span className="bg-primary-soft px-2.5 py-[3px] text-[11.5px] tracking-[0.06em] text-primary-text">
                    {names.get(row.category_id) ?? "—"}
                  </span>
                </td>
                <td className={`${CELL} text-center`}>
                  <SourceTag source={row.source} />
                </td>
                <td className={`${CELL} num pr-3 text-right font-serif font-bold`}>{formatJPY(row.amount_jpy)}</td>
                <td className={`${CELL} text-center`}>
                  <StatusBadge status={row.status} />
                </td>
                <td className={`${CELL} pr-[18px] text-right text-xs whitespace-nowrap`}>
                  {pendingReview && row.upload_id ? (
                    <Link
                      href={{ pathname: "/upload/review", query: { upload: row.upload_id } }}
                      className="font-semibold text-primary hover:text-primary-hover"
                    >
                      確認する →
                    </Link>
                  ) : (
                    <span className="inline-flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditing(row)}
                        className="cursor-pointer font-semibold text-primary hover:text-primary-hover"
                        aria-label={`${row.description} を編集`}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        disabled={pending}
                        className="cursor-pointer text-muted hover:text-ink disabled:opacity-50"
                        aria-label={`${row.description} を削除`}
                      >
                        削除
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {message ? (
        <p aria-hidden className="border-t border-line px-[18px] py-2 text-xs text-muted">
          {message}
        </p>
      ) : null}

      <ExpenseDialog
        open={editing !== null}
        onClose={closeEditor}
        categories={categories}
        expense={editing ?? undefined}
      />
    </>
  );
}
