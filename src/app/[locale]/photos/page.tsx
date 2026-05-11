import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HeroProse } from '@/components/hero-prose';
import { ScrollReveal } from '@/components/scroll-reveal';
import { SectionHeading } from '@/components/section-heading';
import { PhotoGrid } from '@/components/photo-grid';
import { getPhotosByYear, getPhotos } from '@/lib/content-loader';
import type { Locale } from '@/i18n/routing';

// Revalidate every 60s so admin-uploaded photos appear quickly
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('photos') };
}

export default async function PhotosPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'photos.page' });

  const groups = await getPhotosByYear();
  const PHOTOS = await getPhotos();

  return (
    <div>
      <HeroProse eyebrow={t('heroEyebrow')}>
        <p>{t('heroBody')}</p>
      </HeroProse>

      {groups.map(({ year, photos }, gi) => (
        <ScrollReveal as="section" key={year} className="mt-[var(--space-section)]">
          <SectionHeading
            index={String(gi + 1).padStart(2, '0')}
            eyebrow={t('yearEyebrow', { year })}
            title={t('yearTitle', { year })}
          />
          <PhotoGrid photos={photos} allPhotos={PHOTOS} locale={locale} />
        </ScrollReveal>
      ))}
    </div>
  );
}
