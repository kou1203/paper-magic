export type NavItem = {
  href: string;
  label: string;
  /** The single kanji shown before the label in the sidebar. */
  glyph: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "ダッシュボード", glyph: "計" },
  { href: "/upload", label: "アップロード", glyph: "紙" },
  { href: "/expenses", label: "経費明細", glyph: "簿" },
  { href: "/reports", label: "レポート", glyph: "析" },
  { href: "/settings", label: "設定", glyph: "設" },
];

/** True when `pathname` is the item's page or one of its sub-pages. */
export function isNavItemActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
