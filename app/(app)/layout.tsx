import { Sidebar, type SidebarUser } from "@/components/layout/Sidebar";

// Placeholder until authentication lands in KO-6.
const GUEST_USER: SidebarUser = { name: "ゲスト", plan: "個人事業主プラン" };

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <Sidebar user={GUEST_USER} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
