'use client';

import { FolderKanban, FileText, MessageSquare, Eye, Mail, Rss } from 'lucide-react';
import { useAdminLocale } from '@/components/locale-provider';

interface StatsSnapshot {
  date: string;
  githubStars: number | null;
  githubFollowers: number | null;
  chromeTotalUsers: number | null;
  newsletterSubscribers: number | null;
}

interface DashboardStats {
  messages: number;
  totalViews: number;
  posts: number;
  publishedPosts: number;
  projects: number;
  newsletters: number;
  snapshot: StatsSnapshot | null;
}

export function DashboardContent({ stats }: { stats: DashboardStats }) {
  const { t } = useAdminLocale();

  const cards = [
    {
      label: t('dashboard.blogPosts'),
      value: String(stats.posts),
      description: t('dashboard.publishedDrafts')
        .replace('{published}', String(stats.publishedPosts))
        .replace('{drafts}', String(stats.posts - stats.publishedPosts)),
      icon: FileText,
    },
    {
      label: t('dashboard.projects'),
      value: String(stats.projects),
      description: t('dashboard.totalProjects'),
      icon: FolderKanban,
    },
    {
      label: t('dashboard.guestbook'),
      value: String(stats.messages),
      description: t('dashboard.totalMessages'),
      icon: MessageSquare,
    },
    {
      label: t('dashboard.pageViews'),
      value: stats.totalViews.toLocaleString(),
      description: t('dashboard.allPagesCombined'),
      icon: Eye,
    },
    {
      label: t('dashboard.newsletters'),
      value: String(stats.newsletters),
      description: t('dashboard.issuesSent'),
      icon: Mail,
    },
    {
      label: t('dashboard.subscribers'),
      value: String(stats.snapshot?.newsletterSubscribers ?? 0),
      description: t('dashboard.newsletterSubscribers'),
      icon: Rss,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('page.dashboard.title')}</h2>
        <p className="text-muted-foreground">{t('page.dashboard.desc')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="border-border bg-background rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm font-medium">{card.label}</p>
              <card.icon className="text-muted-foreground h-4 w-4" />
            </div>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
            <p className="text-muted-foreground mt-1 text-xs">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Latest Snapshot */}
      {stats.snapshot && (
        <div className="border-border bg-background rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {t('dashboard.latestSnapshot')} ({stats.snapshot.date})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-sm">{t('dashboard.githubStars')}</p>
              <p className="text-2xl font-bold">{stats.snapshot.githubStars}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{t('dashboard.githubFollowers')}</p>
              <p className="text-2xl font-bold">{stats.snapshot.githubFollowers}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{t('dashboard.chromeTotalUsers')}</p>
              <p className="text-2xl font-bold">{stats.snapshot.chromeTotalUsers}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                {t('dashboard.newsletterSubscribers')}
              </p>
              <p className="text-2xl font-bold">{stats.snapshot.newsletterSubscribers}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="border-border bg-background rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">{t('dashboard.quickActions')}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            href="/projects"
            title={t('dashboard.manageProjects')}
            description={t('dashboard.manageProjectsDesc')}
          />
          <QuickLink
            href="/blog"
            title={t('dashboard.writeBlogPost')}
            description={t('dashboard.writeBlogPostDesc')}
          />
          <QuickLink
            href="/photos"
            title={t('dashboard.uploadPhotos')}
            description={t('dashboard.uploadPhotosDesc')}
          />
          <QuickLink
            href="/timeline"
            title={t('dashboard.updateTimeline')}
            description={t('dashboard.updateTimelineDesc')}
          />
          <QuickLink
            href="/now"
            title={t('dashboard.updateNowPage')}
            description={t('dashboard.updateNowPageDesc')}
          />
          <QuickLink
            href="/uses"
            title={t('dashboard.updateUses')}
            description={t('dashboard.updateUsesDesc')}
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
      className="border-border hover:bg-accent block rounded-md border p-4 transition-colors"
    >
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </a>
  );
}
