/** Where an expense came from (経費明細の「出典」列). */
export type ExpenseSource = "csv" | "receipt" | "manual";

const SOURCE_LABELS: Record<ExpenseSource, string> = {
  csv: "CSV",
  receipt: "レシート",
  manual: "手入力",
};

export function SourceTag({ source }: { source: ExpenseSource }) {
  return (
    <span className="text-[11px] tracking-[0.08em] text-muted">{SOURCE_LABELS[source]}</span>
  );
}

/** The kind of uploaded file (アップロード履歴の「種別」列). */
export type UploadKind = "csv" | "xlsx" | "pdf" | "image";

const KIND_LABELS: Record<UploadKind, string> = {
  csv: "CSV",
  xlsx: "Excel",
  pdf: "PDF",
  image: "画像",
};

export function KindTag({ kind }: { kind: UploadKind }) {
  return (
    <span className="inline-block w-11 shrink-0 bg-primary-soft py-[3px] text-center text-[11px] font-semibold tracking-[0.1em] text-primary-text">
      {KIND_LABELS[kind]}
    </span>
  );
}
