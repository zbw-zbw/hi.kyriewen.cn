'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Photo } from '@/content/photos';
import { PhotoLightbox } from '@/components/photo-lightbox';

export interface PhotoGridProps {
  /** 该年份的照片（已分组） */
  photos: Photo[];
  /** 全量照片（用于灯箱跨年份切换；可选，不传则只在本年份切） */
  allPhotos?: Photo[];
  locale: 'en' | 'zh';
}

/**
 * 照片网格 + 灯箱 client wrapper。
 * Server 组件只负责按年份分组并把数据传进来，本组件负责：
 *   1. 渲染网格 + hover 信息
 *   2. 点击图片打开灯箱（接管全屏展示）
 *   3. 支持灯箱跨年份切换（如果传了 allPhotos，index 是 allPhotos 中的位置）
 */
export function PhotoGrid({
  photos,
  allPhotos,
  locale,
}: PhotoGridProps) {
  const lightboxPhotos = allPhotos ?? photos;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const openAt = (photo: Photo) => {
    const idx = lightboxPhotos.findIndex((p) => p.src === photo.src);
    setOpenIndex(idx >= 0 ? idx : 0);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {photos.map((photo) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => openAt(photo)}
            aria-label={`View ${photo.alt}`}
            className="group relative block cursor-zoom-in overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] text-left shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.02]"
            />

            <figcaption className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/85 via-black/60 to-transparent p-4 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {photo.location ?? photo.alt}
                </p>
                <p className="font-mono text-xs text-white/70">
                  {photo.takenAt}
                </p>
              </div>
              {photo.story && (
                <p className="mt-1 text-xs text-white/80">
                  {photo.story[locale]}
                </p>
              )}
              {photo.exif && (
                <p className="mt-2 font-mono text-[10px] tracking-wider text-white/60 uppercase">
                  {[
                    photo.exif.camera,
                    photo.exif.lens,
                    photo.exif.iso && `ISO ${photo.exif.iso}`,
                    photo.exif.aperture,
                    photo.exif.shutter,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </figcaption>
          </button>
        ))}
      </div>

      <PhotoLightbox
        photos={lightboxPhotos}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onIndexChange={setOpenIndex}
        locale={locale}
      />
    </>
  );
}
