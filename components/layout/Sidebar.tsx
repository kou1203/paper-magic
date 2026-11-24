import Link from "next/link";
import { Logo } from "./Logo";
import { SidebarNav } from "./SidebarNav";

export type SidebarUser = {
  name: string;
  plan: string;
};

export function Sidebar({ user }: { user: SidebarUser }) {
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-navy pt-[22px] pb-[18px] text-sidebar-text">
      <Link
        href="/dashboard"
        className="mb-3.5 border-b border-navy-line px-[22px] pb-5 focus-visible:outline-2 focus-visible:outline-sky"
      >
        <Logo />
      </Link>
      <SidebarNav />
      <div className="mt-auto flex items-center gap-2.5 border-t border-navy-line px-[22px] pt-4">
        <span
          aria-hidden
          className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full bg-navy-raised font-serif text-xs"
        >
          {Array.from(user.name)[0] ?? ""}
        </span>
        <span className="flex flex-col leading-[1.4]">
          <span className="text-[12.5px]">{user.name}</span>
          <span className="text-[10.5px] tracking-[0.08em] text-slate">{user.plan}</span>
        </span>
      </div>
    </aside>
  );
}
