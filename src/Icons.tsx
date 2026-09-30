export function Icon({
  name,
  size = 20,
}: {
  name:
    | "arrow"
    | "down"
    | "external"
    | "wallet"
    | "settings"
    | "close"
    | "shield"
    | "check"
    | "copy"
    | "refresh"
    | "layers"
    | "chevron"
    | "sun"
    | "moon"
    | "diamond"
    | "flame";
  size?: number;
}) {
  const paths: Record<typeof name, React.ReactNode> = {
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    down: <path d="M12 4v16m-6-6 6 6 6-6" />,
    external: (
      <>
        <path d="M14 4h6v6m0-6L10 14" />
        <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
      </>
    ),
    wallet: (
      <>
        <path d="M20 8V5a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h15V8H5a2 2 0 0 1 0-4" />
        <path d="M20 12h-5v4h5" />
      </>
    ),
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" fill="currentColor" />
        <circle cx="15" cy="17" r="3" fill="currentColor" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" />
        <path d="M15 4H6a2 2 0 0 0-2 2v9" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    chevron: <path d="m8 5 7 7-7 7" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </>
    ),
    moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
    diamond: (
      <path d="M12 3.5 20.5 12 12 20.5 3.5 12Z" strokeLinejoin="miter" />
    ),
    flame: (
      <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1 2.5 2 3 .2-3.5 0-6 1-8.5Z" />
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

/* Original frog mascot. Face in currentColor, features in fixed ink. */
export function Frog({ size }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 120 100"
      width={size}
      height={size ? (size * 100) / 120 : undefined}
      aria-hidden="true"
    >
      <ellipse cx="60" cy="62" rx="50" ry="34" fill="currentColor" />
      <ellipse cx="37" cy="36" rx="19" ry="16" fill="currentColor" />
      <ellipse cx="83" cy="36" rx="19" ry="16" fill="currentColor" />
      <ellipse cx="37" cy="39" rx="13" ry="10" fill="#fff" />
      <ellipse cx="83" cy="39" rx="13" ry="10" fill="#fff" />
      <circle cx="41" cy="41" r="4.5" fill="#000" />
      <circle cx="87" cy="41" r="4.5" fill="#000" />
      <path d="M22 33c6-7 24-7 30 1" fill="none" stroke="#000" strokeWidth="3" />
      <path d="M68 34c6-8 24-8 30 0" fill="none" stroke="#000" strokeWidth="3" />
      <path
        d="M24 72c14 10 58 10 74-4"
        fill="none"
        stroke="#000"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M26 76c14 9 56 9 70-5"
        fill="none"
        stroke="var(--lips, #c8443b)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="56" cy="58" r="1.8" fill="#000" />
      <circle cx="66" cy="58" r="1.8" fill="#000" />
    </svg>
  );
}

export function TokenIcon({
  token,
  small = false,
}: {
  token: "IMD" | "ETH";
  small?: boolean;
}) {
  return (
    <span
      className={`token-icon ${token.toLowerCase()} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      {token === "IMD" ? (
        <svg viewBox="0 0 32 32">
          <path
            d="M16 5.5 26.5 16 16 26.5 5.5 16Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinejoin="miter"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 32 32">
          <path d="m16 3-8 13 8 5 8-5Z" fill="currentColor" opacity=".8" />
          <path d="m16 23-8-5 8 11 8-11Z" fill="currentColor" />
          <path d="M16 3v18l8-5Z" fill="currentColor" opacity=".45" />
        </svg>
      )}
    </span>
  );
}
