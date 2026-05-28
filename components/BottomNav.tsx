"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    label: "Biblio",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" strokeWidth={active ? 2.2 : 1.6}>
        <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M8 3v18M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3" stroke="currentColor" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/scan",
    label: "Scanner",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" strokeWidth={active ? 2.2 : 1.6}>
        <path d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4M21 9V5a2 2 0 00-2-2h-4M21 15v4a2 2 0 01-2 2h-4" stroke="currentColor" strokeLinecap="round" />
        <line x1="7" y1="12" x2="7" y2="12.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="12" y1="12" x2="12" y2="12.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="17" y1="12" x2="17" y2="12.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Chercher",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" strokeWidth={active ? 2.2 : 1.6}>
        <circle cx="11" cy="11" r="8" stroke="currentColor" />
        <path d="m21 21-4.35-4.35" stroke="currentColor" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/wishlist",
    label: "Wishlist",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} className="w-5 h-5" strokeWidth={active ? 0 : 1.6}>
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          stroke={active ? "none" : "currentColor"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" strokeWidth={active ? 2.2 : 1.6}>
        <circle cx="12" cy="8" r="4" stroke="currentColor" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  const activeIndex = navItems.findIndex((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  const pct = 100 / navItems.length;

  return (
    <nav
      className="fixed left-3 right-3 z-50"
      style={{
        bottom: "max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))",
      }}
    >
      <div className="relative bg-white/90 backdrop-blur-xl border border-stone-200/60 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden">
        {/* Sliding pill */}
        {activeIndex >= 0 && (
          <div
            aria-hidden
            className="absolute inset-y-1.5 rounded-xl bg-amber-700/[0.09] border border-amber-600/20"
            style={{
              width: `${pct}%`,
              left: `${activeIndex * pct}%`,
              transition: "left 0.45s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
        )}

        <div className="relative grid grid-cols-5">
          {navItems.map((item, i) => {
            const active = activeIndex === i;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-3 transition-colors duration-200 ${
                  active ? "text-amber-700" : "text-stone-400 active:text-stone-600"
                }`}
              >
                {item.icon(active)}
                <span
                  className={`text-[9px] font-bold tracking-wide ${
                    active ? "text-amber-700" : "text-stone-400"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
