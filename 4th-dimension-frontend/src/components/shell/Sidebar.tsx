'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', hint: 'Overview' },
  { href: '/escape', label: '🎮 Impossible Escape', hint: '4D Escape Puzzle' },
  { href: '/viewer', label: '4D Viewer', hint: 'Engine canvas' },
  { href: '/scenes', label: 'Scene Library', hint: 'Browse & import' },
  { href: '/admin', label: 'Admin Portal', hint: 'Moderation & Users' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-surface-border bg-surface-raised lg:w-56 lg:border-b-0 lg:border-r">
      <div className="hidden px-4 py-3 lg:block">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Navigation
        </p>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 py-2 lg:flex-col lg:px-3 lg:py-0">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-w-[7rem] rounded-lg px-3 py-2 transition lg:min-w-0 ${
                active
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                  : 'text-muted hover:bg-surface hover:text-foreground'
              }`}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="hidden text-xs text-muted lg:block">{item.hint}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
