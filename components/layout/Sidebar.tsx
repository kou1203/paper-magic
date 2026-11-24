import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { SidebarNav } from "./SidebarNav";

/** The navy sidebar. `account` fills the bottom block (user name, sign out). */
export function Sidebar({ account }: { account: ReactNode }) {
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-navy pt-[22px] pb-[18px] text-sidebar-text">
      <Link
        href="/dashboard"
        className="mb-3.5 border-b border-navy-line px-[22px] pb-5 focus-visible:outline-2 focus-visible:outline-sky"
      >
        <Logo />
      </Link>
      <SidebarNav />
      <div className="mt-auto border-t border-navy-line px-[22px] pt-4">{account}</div>
    </aside>
  );
}

export type SidebarAccountCardProps = {
  name: string;
  plan: string;
  /** Extra control under the name, e.g. the sign-out button. */
  action?: ReactNode;
};

export function SidebarAccountCard({ name, plan, action }: SidebarAccountCardProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full bg-navy-raised font-serif text-xs"
      >
        {Array.from(name)[0] ?? ""}
      </span>
      <span className="flex min-w-0 flex-col leading-[1.4]">
        <span className="truncate text-[12.5px]" title={name}>
          {name}
        </span>
        <span className="text-[10.5px] tracking-[0.08em] text-slate">{plan}</span>
        {action}
      </span>
    </div>
  );
}

/** Same footprint as the card, shown while the user is loading. */
export function SidebarAccountPlaceholder() {
  return (
    <div aria-hidden className="flex items-center gap-2.5">
      <span className="size-[30px] shrink-0 rounded-full bg-navy-raised" />
      <span className="flex flex-col gap-1.5">
        <span className="h-3 w-20 bg-navy-raised" />
        <span className="h-2.5 w-16 bg-navy-raised" />
      </span>
    </div>
  );
}
