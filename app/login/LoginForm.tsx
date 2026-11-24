"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials";
import { buttonClassName } from "@/components/ui/Button";
import { signIn, signUp, type AuthFormState } from "./actions";

type Mode = "signIn" | "signUp";

const MODES: { value: Mode; label: string }[] = [
  { value: "signIn", label: "ログイン" },
  { value: "signUp", label: "新規登録" },
];

export function LoginForm({ next, linkFailed }: { next: string; linkFailed: boolean }) {
  const [mode, setMode] = useState<Mode>("signIn");
  const panelId = useId();

  return (
    <div>
      <div role="tablist" aria-label="ログイン方法" className="mb-6 grid grid-cols-2 border-b border-line">
        {MODES.map((item) => {
          const selected = item.value === mode;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              onClick={() => setMode(item.value)}
              className={[
                "-mb-px border-b-2 pb-2.5 text-[13px] font-semibold tracking-[0.08em] transition-colors cursor-pointer",
                selected ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div id={panelId} role="tabpanel">
        {/* Remount on mode change so each form keeps its own state. */}
        <CredentialsForm key={mode} mode={mode} next={next} linkFailed={linkFailed} />
      </div>
    </div>
  );
}

function CredentialsForm({ mode, next, linkFailed }: { mode: Mode; next: string; linkFailed: boolean }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    mode === "signIn" ? signIn : signUp,
    linkFailed ? { error: "リンクが無効か期限切れです。もう一度ログインしてください。" } : {},
  );
  const emailId = useId();
  const passwordId = useId();

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <p role="alert" className="border border-ink bg-canvas px-3 py-2.5 text-[12.5px] leading-relaxed">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p role="status" className="border border-success-line bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-success">
          {state.notice}
        </p>
      ) : null}

      <Field
        id={emailId}
        label="メールアドレス"
        error={state.fieldErrors?.email}
        input={
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={state.fieldErrors?.email ? `${emailId}-error` : undefined}
            className={INPUT}
          />
        }
      />
      <Field
        id={passwordId}
        label="パスワード"
        hint={mode === "signUp" ? `${MIN_PASSWORD_LENGTH}文字以上` : undefined}
        error={state.fieldErrors?.password}
        input={
          <input
            id={passwordId}
            name="password"
            type="password"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            required
            minLength={MIN_PASSWORD_LENGTH}
            aria-invalid={Boolean(state.fieldErrors?.password)}
            aria-describedby={state.fieldErrors?.password ? `${passwordId}-error` : undefined}
            className={INPUT}
          />
        }
      />

      <button type="submit" disabled={pending} className={buttonClassName("primary", "mt-2 w-full py-2.5")}>
        {pending ? "送信中…" : mode === "signIn" ? "ログイン" : "登録する"}
      </button>
    </form>
  );
}

const INPUT =
  "w-full border border-line bg-paper px-3 py-2.5 text-sm text-ink focus-visible:border-primary focus-visible:outline-none aria-[invalid=true]:border-ink";

function Field({
  id,
  label,
  hint,
  error,
  input,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  input: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-baseline gap-2 text-[12.5px] tracking-[0.1em] text-muted">
        {label}
        {hint ? <span className="text-[11px] tracking-normal">（{hint}）</span> : null}
      </label>
      {input}
      {error ? (
        <p id={`${id}-error`} className="text-[12px] font-semibold text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
