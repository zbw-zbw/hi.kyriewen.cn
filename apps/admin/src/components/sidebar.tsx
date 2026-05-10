'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  Image,
  Calendar,
  Wrench,
  Link2,
  TrendingUp,
  FileText,
  MessageSquare,
  Mail,
  Database,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/blog', label: 'Blog', icon: FileText },
      { href: '/projects', label: 'Projects', icon: FolderKanban },
      { href: '/now', label: 'Now', icon: Clock },
      { href: '/photos', label: 'Photos', icon: Image },
      { href: '/timeline', label: 'Timeline', icon: Calendar },
      { href: '/uses', label: 'Uses', icon: Wrench },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { href: '/newsletter', label: 'Newsletter', icon: Mail },
      { href: '/guestbook', label: 'Guestbook', icon: MessageSquare },
      { href: '/social', label: 'Social Links', icon: Link2 },
      { href: '/popular', label: 'Popular Posts', icon: TrendingUp },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/seed', label: 'Seed Data', icon: Database },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">⚙️</span>
          <span>Admin Panel</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                      {item.label}
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Link>
      </div>
    </aside>
  );
}
