import Link from "next/link";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "outline";

const BASE =
  "inline-flex items-center justify-center gap-1.5 border px-5 py-2 text-[13px] font-semibold tracking-[0.05em] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-primary text-white hover:bg-primary-hover",
  outline: "border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
};

export function buttonClassName(variant: ButtonVariant = "primary", className?: string): string {
  return [BASE, VARIANTS[variant], className].filter(Boolean).join(" ");
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant };

export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}
