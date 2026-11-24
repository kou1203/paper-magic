import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthSwitcher } from "./MonthSwitcher";
import { KindTag, SourceTag } from "./SourceTag";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it.each([
    ["needs_review", "確認待ち"],
    ["pending_review", "確認待ち"],
    ["completed", "取込完了"],
    ["confirmed", "確定"],
    ["processing", "処理中"],
    ["failed", "失敗"],
  ] as const)("labels %s as %s", (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("SourceTag / KindTag", () => {
  it("uses the Japanese labels from the design", () => {
    render(
      <>
        <SourceTag source="receipt" />
        <SourceTag source="manual" />
        <KindTag kind="image" />
      </>,
    );
    expect(screen.getByText("レシート")).toBeInTheDocument();
    expect(screen.getByText("手入力")).toBeInTheDocument();
    expect(screen.getByText("画像")).toBeInTheDocument();
  });
});

describe("MonthSwitcher", () => {
  it("shows the month and links to the neighbouring months across a year boundary", () => {
    render(<MonthSwitcher month="2025-01" basePath="/dashboard" />);
    expect(screen.getByText("2025年1月")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "前の月（2024年12月）" })).toHaveAttribute(
      "href",
      "/dashboard?month=2024-12",
    );
    expect(screen.getByRole("link", { name: "次の月（2025年2月）" })).toHaveAttribute(
      "href",
      "/dashboard?month=2025-02",
    );
  });

  it("keeps other query values when changing month", () => {
    render(<MonthSwitcher month="2024-06" basePath="/expenses" query={{ category: "3", q: "AI" }} />);
    const href = screen.getByRole("link", { name: "次の月（2024年7月）" }).getAttribute("href");
    const params = new URL(href ?? "", "http://x").searchParams;
    expect(Object.fromEntries(params)).toEqual({ category: "3", q: "AI", month: "2024-07" });
  });

  it("drops the link at the edge of the supported range", () => {
    render(<MonthSwitcher month="2099-12" basePath="/expenses" />);
    expect(screen.getByRole("link", { name: "前の月（2099年11月）" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /次の月/ })).not.toBeInTheDocument();
    expect(screen.getByText("次の月はありません")).toBeInTheDocument();
  });
});
