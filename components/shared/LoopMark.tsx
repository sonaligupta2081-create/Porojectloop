export function LoopMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path
        d="M20 6a14 14 0 1 0 9.9 4.1"
        stroke="url(#loopGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        className="loop-draw"
      />
      <path d="M22 4 L30.5 10.5 L21.5 13.5 Z" fill="#a78bfa" />
      <defs>
        <linearGradient id="loopGrad" x1="4" y1="4" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
