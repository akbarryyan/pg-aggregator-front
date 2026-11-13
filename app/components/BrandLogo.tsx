/**
 * WhuzPay brand: a payment card with a "paid" check badge on the orange tile.
 * Used by the admin and merchant sidebars and the admin login page.
 */

/** The symbol only (orange tile). size = tile edge in Tailwind units via className. */
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-md bg-[#ff5e16] ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none">
        {/* card */}
        <rect x="2" y="5" width="17" height="12" rx="2.5" fill="#ffffff" />
        {/* magnetic stripe */}
        <rect x="2" y="8" width="17" height="2.4" fill="#06163a" />
        {/* amount line */}
        <rect x="4.5" y="13" width="5.5" height="1.6" rx="0.8" fill="#06163a" opacity="0.35" />
        {/* paid badge */}
        <circle cx="18" cy="17" r="5" fill="#06163a" stroke="#ff5e16" strokeWidth="1.5" />
        <path
          d="M15.8 17.1l1.5 1.5 2.9-3"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** "WhuzPay." wordmark; colour comes from the parent (white in sidebars). */
export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      WhuzPay<span className="text-[#ff5e16]">.</span>
    </span>
  );
}
