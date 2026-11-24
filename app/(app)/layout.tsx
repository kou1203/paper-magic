import { Suspense, type ReactNode } from "react";
import { Sidebar, SidebarAccountPlaceholder } from "@/components/layout/Sidebar";
import { SidebarAccount } from "@/components/layout/SidebarAccount";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar
        account={
          // The session is read per request, so it streams in behind Suspense
          // while the rest of the shell is prerendered.
          <Suspense fallback={<SidebarAccountPlaceholder />}>
            <SidebarAccount />
          </Suspense>
        }
      />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
