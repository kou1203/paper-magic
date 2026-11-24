import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isNavItemActive } from "@/lib/navigation";
import { SidebarNav } from "./SidebarNav";

const pathname = vi.hoisted(() => ({ current: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

describe("isNavItemActive", () => {
  it("matches the page itself and its sub-pages only", () => {
    expect(isNavItemActive("/upload", "/upload")).toBe(true);
    expect(isNavItemActive("/upload", "/upload/review")).toBe(true);
    expect(isNavItemActive("/upload", "/uploads")).toBe(false);
    expect(isNavItemActive("/upload", "/dashboard")).toBe(false);
  });
});

describe("SidebarNav", () => {
  beforeEach(() => {
    pathname.current = "/dashboard";
  });

  it("links to every main screen in design order", () => {
    render(<SidebarNav />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
      "/upload",
      "/expenses",
      "/reports",
      "/settings",
    ]);
  });

  it("marks only the current section", () => {
    pathname.current = "/upload/review";
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: /アップロード/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /ダッシュボード/ })).not.toHaveAttribute("aria-current");
  });
});
