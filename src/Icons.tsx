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
    | "chevron";
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
        <rect x="8" y="8" width="12" height="12" rx="2" />
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
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
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
        <svg viewBox="0 0 40 40">
          <path d="M10 11h7v7h6v-7h7v18h-7v-7h-6v7h-7z" fill="currentColor" />
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
