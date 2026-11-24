import type { ReactNode } from "react";

/** Placeholder panel: the stamped glyph plus a short message. */
export function EmptyState({ glyph, children }: { glyph: string; children: ReactNode }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-3 border border-line bg-canvas">
      <span
        aria-hidden
        className="inline-flex size-11 items-center justify-center border border-slate font-serif text-xl font-bold text-slate"
      >
        {glyph}
      </span>
      <p className="text-xs tracking-[0.14em] text-muted">{children}</p>
    </div>
  );
}
