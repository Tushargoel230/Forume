/* Forume logo: a rotated proof-stamp mark carrying the F, plus wordmark. */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <g transform="rotate(-6 15 15)">
          <rect
            x="3" y="3" width="24" height="24" rx="4"
            fill="none" stroke="#c5283d" strokeWidth="2.6"
          />
          <text
            x="15" y="21.5" textAnchor="middle"
            fontFamily="Georgia, serif" fontStyle="italic"
            fontSize="17" fontWeight="700" fill="#c5283d"
          >
            F
          </text>
        </g>
      </svg>
      <span
        className={`font-bold tracking-[0.18em] text-lg ${light ? "text-paper" : "text-ink"}`}
      >
        FOR<span className="text-crimson">UME</span>
      </span>
    </span>
  );
}
