// The Spacing Inspector logo (the extension's icon), redrawn as a vector.
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg className="mark" viewBox="0 0 128 128" width={size} height={size} aria-hidden="true">
      <rect width="128" height="128" rx="22" fill="#E3F8FA" />
      <g fill="#0FC0D6" stroke="#0FC0D6" strokeLinejoin="round" strokeWidth="3">
        <path d="M46 33 57 45.5H35Z" />
        <path d="M46 95 57 82.5H35Z" />
      </g>
      <path d="M46 44v40" stroke="#0FC0D6" strokeWidth="8" />
      <g strokeLinecap="round" strokeWidth="4.5">
        <path d="M67 38h29" stroke="#80DDE9" />
        <path d="M65 64h31" stroke="#0FC0D6" />
        <path d="M67 90h29" stroke="#90E3EC" />
      </g>
    </svg>
  );
}
