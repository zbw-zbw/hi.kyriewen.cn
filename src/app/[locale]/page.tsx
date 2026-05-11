import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, Eye, TrendingUp, Github, Twitter, Mail, Rss } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { HeroProse } from '@/components/hero-prose';
import { NowPlayingInline } from '@/components/now-playing-inline';
import { ScrollReveal } from '@/components/scroll-reveal';
import { ProductCard } from '@/components/product-card';
import { SectionHeading } from '@/components/section-heading';
import { EmailLink } from '@/components/email-link';
import { getFeaturedProjects, getSocialLinks } from '@/lib/content-loader';
import { fetchRepoStats } from '@/lib/github';
import { getAllPosts } from '@/lib/blog';
import { formatDate } from '@/lib/utils';
import { db, pageViews } from '@/lib/db';
import { desc } from 'drizzle-orm';
import type { Locale } from '@/i18n/routing';

/** 行内链接统一样式（Lee Robinson 风：所有链接都 underline） */
const LINK_CLASS =
  'cursor-pointer underline decoration-[var(--border)] decoration-1 underline-offset-4 transition-colors hover:decoration-[var(--accent)] hover:text-[var(--accent)]';

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');

  const rawProjects = await getFeaturedProjects();
  const socialLinks = await getSocialLinks();

  // 为首页精选作品获取 GitHub stars（对齐产品页卡片）
  const projects = await Promise.all(
    rawProjects.map(async (project) => {
      const stats = project.repo ? await fetchRepoStats(project.repo).catch(() => null) : null;
      return { ...project, _stars: stats?.stars as number | undefined };
    }),
  );
  const allPostsForLocale = await getAllPosts(locale);
  const latestPosts = allPostsForLocale.slice(0, 3);

  // 热门博客：从数据库 page_views 表读取真实浏览量，取 Top 3
  let popularPosts: {
    post: (typeof allPostsForLocale)[number];
    views: number;
    trend?: 'up' | 'flat' | 'down';
  }[] = [];
  try {
    const topViews = await db.select().from(pageViews).orderBy(desc(pageViews.views)).limit(5);
    popularPosts = topViews
      .map((row) => {
        // slug 格式为 "blog/hello-world"，需去掉 "blog/" 前缀匹配文章
        const blogSlug = row.slug.startsWith('blog/') ? row.slug.slice(5) : row.slug;
        const post = allPostsForLocale.find((x) => x.slug === blogSlug);
        return post ? { post, views: row.views, trend: 'up' as const } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .slice(0, 3);
  } catch {
    // 数据库连接失败时静默降级（本地 SSL 问题等）
  }

  return (
    <div>
      {/* ── Hero: 散文式 (Lee Robinson 风) ── */}
      <HeroProse eyebrow={t('hero.eyebrow')}>
        {/* 第一段：自我介绍 + 主推产品 */}
        <p>
          {t('hero.proseLead')}{' '}
          <Link href="/projects/image-harvest" className={LINK_CLASS}>
            Image Harvest
          </Link>
          {', '}
          <Link href="/projects/qr-code-generator" className={LINK_CLASS}>
            QR Code Generator
          </Link>{' '}
          {t('hero.proseAndOthers')}
        </p>

        {/* 第二段：正在听（独立段落，与"折腾过程"拆开） */}
        <p className="mt-6">
          {t('hero.proseListening')} <NowPlayingInline fallback="music" />
          {locale === 'zh' ? '。' : '.'}
        </p>

        {/* 第三段：写作 + 联系（独立段落） */}
        <p className="mt-6">
          {t('hero.proseWriting')}{' '}
          <Link href="/blog" className={LINK_CLASS}>
            {locale === 'en' ? 'my blog' : '博客'}
          </Link>
          {locale === 'zh' ? '。' : '. '}
          {t('hero.proseConnect')}{' '}
          <Link href="/guestbook" className={LINK_CLASS}>
            {locale === 'zh' ? '留言墙' : 'guestbook'}
          </Link>
          {locale === 'zh' ? '。' : '.'}
        </p>
      </HeroProse>

      {/* ── FIG 01 — Selected Work ── */}
      <ScrollReveal as="section" className="mt-[var(--space-section)]">
        <SectionHeading
          index="01"
          eyebrow={t('products.eyebrow')}
          title={t('products.title')}
          subtitle={t('products.subtitle')}
          action={
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 text-sm text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
            >
              {t('products.viewAll')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project, i) => (
            <ScrollReveal key={project.slug} delay={i * 0.08}>
              <ProductCard project={project} locale={locale} stars={project._stars} highlighted />
            </ScrollReveal>
          ))}
        </div>
      </ScrollReveal>

      {/* ── FIG 02 — Latest Writing ── */}
      <ScrollReveal as="section" className="mt-[var(--space-section)]">
        <SectionHeading
          index="02"
          eyebrow={t('writing.eyebrow')}
          title={t('writing.title')}
          action={
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
            >
              {t('writing.viewAll')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        {latestPosts.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t('writing.empty')}</p>
        ) : (
          <ul className="group/list">
            {latestPosts.map((post) => (
              <li
                key={post.slug}
                className="border-b border-[var(--border)] transition-opacity group-hover/list:opacity-50 last:border-0 hover:!opacity-100"
              >
                <Link
                  href={`/blog/${post.slug}`}
                  prefetch
                  className="flex items-baseline justify-between gap-4 py-4 transition-colors hover:text-[var(--accent)]"
                >
                  <span className="font-medium">{post.title}</span>
                  <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
                    {formatDate(post.date, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ScrollReveal>

      {/* ── FIG 03 — Most Read ── */}
      {popularPosts.length > 0 && (
        <ScrollReveal as="section" className="mt-[var(--space-section)]">
          <SectionHeading
            index="03"
            eyebrow={locale === 'zh' ? '热门' : 'Popular'}
            title={locale === 'zh' ? '最常被阅读' : 'Most read'}
            subtitle={
              locale === 'zh'
                ? '过去 30 天访问量最高的几篇。'
                : 'The most visited posts in the last 30 days.'
            }
          />
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--card)]">
            {popularPosts.map(({ post, views, trend }, i) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  prefetch
                  className="flex items-baseline justify-between gap-4 p-4 transition-colors hover:bg-[var(--bg)]"
                >
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="font-mono text-xs text-[var(--muted)] tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate font-medium">{post.title}</span>
                    {trend === 'up' && (
                      <TrendingUp
                        className="h-3 w-3 shrink-0 text-emerald-500"
                        aria-label="trending up"
                      />
                    )}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-[var(--muted)]">
                    <Eye className="h-3 w-3" />
                    {views.toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      )}

      {/* ── FIG 04 — What I'm Doing Now ── */}
      <ScrollReveal as="section" className="mt-[var(--space-section)]">
        <SectionHeading index="04" eyebrow={t('now.eyebrow')} title={t('now.title')} />
        <p className="max-w-prose text-base leading-relaxed text-[var(--muted-fg)]">
          {locale === 'zh'
            ? '我正在打造的产品、正在学习的技术、正在读的书、正在听的音乐 —— 都在 /now 页面持续更新。'
            : "What I'm building, learning, reading, and listening to — updated on the /now page."}
        </p>
        <Link
          href="/now"
          className="mt-4 inline-flex cursor-pointer items-center gap-1 text-sm text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
        >
          {locale === 'zh' ? '查看完整 /now 页面' : 'Read the full /now page'}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </ScrollReveal>

      {/* ── FIG 05 — Connect ── */}
      <ScrollReveal as="section" className="mt-[var(--space-section)] pb-8">
        <SectionHeading index="05" eyebrow={t('connect.eyebrow')} title={t('connect.title')} />
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {socialLinks
            .filter((link) => !link.isEmail)
            .map((link) => {
              const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
                Github,
                Twitter,
                Mail,
                Rss,
              };
              const Icon = iconMap[link.iconName] ?? Mail;
              return (
                <a
                  key={link.name}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
                >
                  <Icon className="h-4 w-4 transition-colors group-hover:text-[var(--accent)]" />
                  <span>{link.name}</span>
                </a>
              );
            })}
          <EmailLink variant="inline" label="Email" />
        </div>
      </ScrollReveal>
    </div>
  );
}
