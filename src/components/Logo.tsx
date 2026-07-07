/* Forume logo: a rotated proof-stamp mark carrying the F, plus wordmark.
   Gold mark works on both the noir landing and the paper workspace. */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 30 30" aria-hidden="true">
        <g transform="rotate(-6 15 15)">
          <rect
            x="3" y="3" width="24" height="24" rx="4"
            fill="none" stroke="#c9a227" strokeWidth="2.4"
          />
          <text
            x="15" y="21.5" textAnchor="middle"
            fontFamily="Georgia, serif" fontStyle="italic"
            fontSize="17" fontWeight="700" fill="#c9a227"
          >
            F
          </text>
        </g>
      </svg>
      <span
        className={`font-bold tracking-[0.18em] text-lg ${light ? "text-bone" : "text-ink"}`}
      >
        FOR<span className="text-gold">UME</span>
      </span>
    </span>
  );
}
