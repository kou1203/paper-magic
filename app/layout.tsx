import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Paper Magic",
    template: "%s | Paper Magic",
  },
  description: "個人事業主のための経費管理。明細とレシートから確定申告用の経費台帳を作ります。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
