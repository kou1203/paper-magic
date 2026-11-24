import { signOut } from "@/app/(app)/actions";
import { displayNameOf, getCurrentUser } from "@/lib/auth/current-user";
import { SidebarAccountCard } from "./Sidebar";

/** Signed-in user and sign-out button. Reads the session, so render inside Suspense. */
export async function SidebarAccount() {
  const user = await getCurrentUser();
  return (
    <SidebarAccountCard
      name={displayNameOf(user)}
      plan="個人事業主プラン"
      action={
        <form action={signOut}>
          <button
            type="submit"
            className="mt-1 cursor-pointer text-[10.5px] tracking-[0.08em] text-slate underline-offset-2 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-sky"
          >
            ログアウト
          </button>
        </form>
      }
    />
  );
}
