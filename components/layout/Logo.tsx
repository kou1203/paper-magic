/** Logo 2c: a round seal around a sheet of paper with a sparkle, tilted -6°. */
export function LogoMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      className={["shrink-0 -rotate-6", className].filter(Boolean).join(" ")}
    >
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M11.5 9h6.5l4 4v10H11.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M18 9v4h4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M15.5 14.2L16.4 16.1L18.3 17L16.4 17.9L15.5 19.8L14.6 17.9L12.7 17L14.6 16.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="text-sky" />
      <span className="font-serif text-base font-bold tracking-[0.03em] text-white">Paper Magic</span>
    </span>
  );
}
