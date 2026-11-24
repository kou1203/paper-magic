import type { ComponentProps, ReactNode } from "react";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={["border border-line bg-white px-6 py-5", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

type CardTitleProps = {
  children: ReactNode;
  /** Small muted note beside the title, e.g. the period being shown. */
  note?: ReactNode;
  /** Right-aligned slot, e.g. a "すべて見る →" link. */
  action?: ReactNode;
};

export function CardTitle({ children, note, action }: CardTitleProps) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <h2 className="font-serif text-[15.5px] font-bold tracking-[0.08em]">{children}</h2>
      {note ? <span className="text-[11px] tracking-[0.06em] text-muted">{note}</span> : null}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}
