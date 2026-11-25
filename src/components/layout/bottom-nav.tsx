'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, Sparkles, Wallet, User } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const [isCompact, setIsCompact] = useState(false);
  const lastYRef = useRef(0);

  // 4 Core Tabs: Cửa Hàng, Buff MXH, Ví Tiền, Hồ Sơ
  const navItems = [
    { href: '/', label: 'Cửa Hàng', icon: Store },
    { href: '/buff', label: 'Buff MXH', icon: Sparkles },
    { href: '/wallet', label: 'Ví Tiền', icon: Wallet },
    { href: '/profile', label: 'Hồ Sơ', icon: User },
  ];

  const activeIndex = useMemo(() => {
    if (pathname === '/' || pathname.startsWith('/services') || pathname.startsWith('/store')) return 0;
    if (pathname.startsWith('/buff')) return 1;
    if (pathname.startsWith('/wallet') || pathname.startsWith('/spin')) return 2;
    if (
      pathname.startsWith('/profile') ||
      pathname.startsWith('/account') ||
      pathname.startsWith('/orders') ||
      pathname.startsWith('/warranty') ||
      pathname.startsWith('/affiliate')
    ) {
      return 3;
    }
    return 0;
  }, [pathname]);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastYRef.current;
      if (y > 80 && delta > 8) {
        setIsCompact(true);
      } else if (delta < -6 || y <= 40) {
        setIsCompact(false);
      }
      lastYRef.current = y;

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIsCompact(false), 900);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);

  return (
    <nav
      aria-label="Thanh điều hướng di động"
      className={`lg:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] inset-x-3 sm:inset-x-auto sm:w-[400px] sm:left-1/2 sm:-translate-x-1/2 z-40 rounded-[34px] liquid-glass-dock p-1.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isCompact
          ? 'h-[54px] scale-[0.94] translate-y-1.5 opacity-90'
          : 'h-[66px] scale-100 translate-y-0 opacity-100'
      }`}
    >
      <div className="relative w-full h-full flex items-center">
        {/* Spring Sliding Liquid Glass Pill */}
        <div
          aria-hidden="true"
          className="active-liquid-pill absolute top-1 bottom-1 w-[25%] rounded-[26px] bg-sky-400/15 border border-sky-300/30 shadow-[inset_0_1px_1px_rgba(186,230,253,0.28),0_4px_16px_rgba(14,165,233,0.2)] pointer-events-none transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
          style={{
            transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
          }}
        />

        <div className="grid grid-cols-4 w-full h-full items-center relative z-10">
          {navItems.map((item, idx) => {
            const isActive = activeIndex === idx;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center h-full rounded-2xl select-none group"
              >
                <Icon
                  className={`w-4 h-4 transition-all duration-200 ${
                    isActive
                      ? 'text-[#38BDF8] scale-110'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                  strokeWidth={isActive ? 2.1 : 1.75}
                />
                {!isCompact && (
                  <span
                    className={`mt-0.5 text-[10px] tracking-tight truncate max-w-full leading-tight transition-colors ${
                      isActive
                        ? 'font-bold text-white'
                        : 'font-medium text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
