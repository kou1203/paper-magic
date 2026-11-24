"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navigation";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="メインメニュー" className="flex flex-col">
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center gap-3 border-l-[3px] py-[11px] pr-5 pl-[19px] text-[13px] tracking-[0.06em] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky",
              active
                ? "border-primary bg-primary/18 text-white"
                : "border-transparent text-slate hover:text-white",
            ].join(" ")}
          >
            <span aria-hidden className={["font-serif text-xs", active ? "text-sky" : ""].join(" ")}>
              {item.glyph}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
