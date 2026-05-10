import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HeroProse } from '@/components/hero-prose';
import { ScrollReveal } from '@/components/scroll-reveal';
import { SectionHeading } from '@/components/section-heading';
import { PhotoGrid } from '@/components/photo-grid';
import { getPhotosByYear, getPhotos } from '@/lib/content-loader';
import type { Locale } from '@/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('photos') };
}

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const groups = await getPhotosByYear();
  const PHOTOS = await getPhotos();
  const isZh = locale === 'zh';

  return (
    <div>
      <HeroProse eyebrow={isZh ? '照片 · 旅行足迹' : 'Photos · Travel'}>
        <p>
          {isZh
            ? '一些路上的瞬间。占位图来自 Unsplash，会陆续替换为我自己拍的。'
            : 'Moments from the road. Placeholders from Unsplash for now — will be swapped with my own gradually.'}
        </p>
      </HeroProse>

      {groups.map(({ year, photos }, gi) => (
        <ScrollReveal
          as="section"
          key={year}
          className="mt-[var(--space-section)]"
        >
          <SectionHeading
            index={String(gi + 1).padStart(2, '0')}
            eyebrow={isZh ? `${year} 年` : String(year)}
            title={isZh ? `${year} 年的瞬间` : `Moments from ${year}`}
          />
          <PhotoGrid photos={photos} allPhotos={PHOTOS} locale={locale} />
        </ScrollReveal>
      ))}
    </div>
  );
}

