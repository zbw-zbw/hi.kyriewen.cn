import { db } from '@repo/db';
import {
  guestbookMessages,
  statsSnapshot,
  pageViews,
} from '@repo/db/schema';
import { desc, count, sql } from 'drizzle-orm';
import {
  FolderKanban,
  FileText,
  MessageSquare,
  Eye,
} from 'lucide-react';

async function getStats() {
  try {
    const [messageCount] = await db
      .select({ count: count() })
      .from(guestbookMessages);

    const [viewCount] = await db
      .select({ total: sql<number>`coalesce(sum(${pageViews.views}), 0)` })
      .from(pageViews);

    const latestSnapshot = await db
      .select()
      .from(statsSnapshot)
      .orderBy(desc(statsSnapshot.date))
      .limit(1);

    return {
      messages: messageCount?.count ?? 0,
      totalViews: viewCount?.total ?? 0,
      snapshot: latestSnapshot[0] ?? null,
    };
  } catch {
    return { messages: 0, totalViews: 0, snapshot: null };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      label: 'Content Items',
      value: '~40',
      description: '7 content types (hardcoded)',
      icon: FolderKanban,
    },
    {
      label: 'Blog Posts',
      value: '—',
      description: 'MDX files (file system)',
      icon: FileText,
    },
    {
      label: 'Guestbook Messages',
      value: String(stats.messages),
      description: 'Total messages',
      icon: MessageSquare,
    },
    {
      label: 'Total Page Views',
      value: stats.totalViews.toLocaleString(),
      description: 'All pages combined',
      icon: Eye,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to the admin panel. Manage your site content here.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-background p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {card.label}
              </p>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      {/* Latest Snapshot */}
      {stats.snapshot && (
        <div className="rounded-lg border border-border bg-background p-6">
          <h3 className="mb-4 text-lg font-semibold">
            Latest Stats Snapshot ({stats.snapshot.date})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">GitHub Stars</p>
              <p className="text-2xl font-bold">
                {stats.snapshot.githubStars}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">GitHub Followers</p>
              <p className="text-2xl font-bold">
                {stats.snapshot.githubFollowers}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Chrome Total Users
              </p>
              <p className="text-2xl font-bold">
                {stats.snapshot.chromeTotalUsers}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Newsletter Subscribers
              </p>
              <p className="text-2xl font-bold">
                {stats.snapshot.newsletterSubscribers}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="rounded-lg border border-border bg-background p-6">
        <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            href="/projects"
            title="Manage Projects"
            description="Add, edit, or remove projects"
          />
          <QuickLink
            href="/blog"
            title="Write Blog Post"
            description="Create or edit MDX articles"
          />
          <QuickLink
            href="/photos"
            title="Upload Photos"
            description="Manage photo gallery"
          />
          <QuickLink
            href="/timeline"
            title="Update Timeline"
            description="Add milestones and events"
          />
          <QuickLink
            href="/now"
            title="Update Now Page"
            description="What you're currently doing"
          />
          <QuickLink
            href="/uses"
            title="Update Uses"
            description="Hardware, software, and tools"
          />
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-md border border-border p-4 transition-colors hover:bg-accent"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </a>
  );
}
