import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoMark } from "@/components/layout/Logo";
import { safeNextPath } from "@/lib/auth/paths";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "ログイン" };

async function LoginFormFromQuery({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next, error } = await searchParams;
  return <LoginForm next={safeNextPath(next)} linkFailed={error === "link"} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <LogoMark size={52} className="text-primary" />
          <h1 className="font-serif text-2xl font-bold tracking-[0.04em]">Paper Magic</h1>
          <p className="text-xs tracking-[0.1em] text-muted">明細とレシートから、確定申告の経費台帳を。</p>
        </div>
        <div className="border border-line bg-white px-8 pt-6 pb-8 shadow-[0_24px_48px_-28px_rgba(16,35,60,0.3)]">
          <Suspense fallback={<div aria-hidden className="h-72" />}>
            <LoginFormFromQuery searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
