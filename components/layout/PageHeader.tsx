import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  /** Short muted description beside the title. */
  description?: ReactNode;
  /** Element before the title, e.g. a "← 戻る" link. */
  leading?: ReactNode;
  /** Right-aligned controls: month switcher, buttons. */
  actions?: ReactNode;
};

export function PageHeader({ title, description, leading, actions }: PageHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-white px-7">
      {leading}
      <h1 className="font-serif text-[19px] font-bold tracking-[0.06em]">{title}</h1>
      {description ? (
        <p className="ml-1 text-xs tracking-[0.04em] text-muted">{description}</p>
      ) : null}
      {actions ? <div className="ml-auto flex items-center gap-3">{actions}</div> : null}
    </header>
  );
}

/** Padded page body below the header. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5 px-7 pt-[26px] pb-[30px]">{children}</div>;
}
