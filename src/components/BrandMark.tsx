interface BrandMarkProps {
  size?: number;
  className?: string;
  /** Filled app-icon look (About / large). Default is the stroke mark for the TopBar. */
  filled?: boolean;
}

/** Oficina CNC mark: plate + origin + end mill, readable at 18 px. */
export function BrandMark({ size = 18, className, filled = false }: BrandMarkProps) {
  if (filled) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className={className}
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="#16283d" />
        <rect x="4.5" y="4.5" width="23" height="23" rx="3.5" fill="none" stroke="#4f88b8" strokeWidth="1.25" />
        <MarkPaths stroke="#f7f7f5" fill="#f7f7f5" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="26" height="26" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <MarkPaths stroke="currentColor" fill="currentColor" />
    </svg>
  );
}

function MarkPaths({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <>
      <path
        d="M7.5 21.25V25.25H11.5"
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="14.25" r="6.1" fill="none" stroke={stroke} strokeWidth="1.75" />
      <circle cx="18" cy="14.25" r="1.85" fill={fill} />
      <path
        d="M18 8.4V20.1"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  );
}
