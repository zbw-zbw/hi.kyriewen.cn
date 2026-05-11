const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hi.kyriewen.cn';

export function PersonJsonLd({ sameAs }: { sameAs?: string[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Kyriewen',
    url: SITE_URL,
    image: `${SITE_URL}/og`,
    jobTitle: 'Frontend Developer & Indie Hacker',
    sameAs: sameAs ?? ['https://github.com/zbw-zbw', 'https://x.com/kyriewen'],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function WebSiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Kyriewen',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function BlogPostingJsonLd({
  title,
  summary,
  date,
  url,
}: {
  title: string;
  summary: string;
  date: string;
  url: string;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: summary,
    datePublished: date,
    dateModified: date,
    author: {
      '@type': 'Person',
      name: 'Kyriewen',
      url: SITE_URL,
    },
    url,
    mainEntityOfPage: url,
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
