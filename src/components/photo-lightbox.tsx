'use client';

import { useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Photo } from '@/content/photos';
import { cn } from '@/lib/utils';

export interface PhotoLightboxProps {
  photos: Photo[];
  /** 当前打开的图片 index；null = 关闭 */
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  locale: 'en' | 'zh';
}

/**
 * 照片墙灯箱：
 * - 全屏遮罩 + 居中大图
 * - ← → 箭头切换；ESC 关闭
 * - 移动端 framer-motion pan gesture，左右滑切换
 * - 底部覆盖层显示 location / story / EXIF
 * - 锁滚动 + reduce-motion 兼容
 */
export function PhotoLightbox({
  photos,
  index,
  onClose,
  onIndexChange,
  locale,
}: PhotoLightboxProps) {
  const open = index !== null;
  const photo = open ? photos[index!] : null;

  const goPrev = useCallback(() => {
    if (index === null) return;
    onIndexChange((index - 1 + photos.length) % photos.length);
  }, [index, onIndexChange, photos.length]);

  const goNext = useCallback(() => {
    if (index === null) return;
    onIndexChange((index + 1) % photos.length);
  }, [index, onIndexChange, photos.length]);

  // 键盘 ← → ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, goPrev, goNext]);

  // 锁滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 拖拽手势：左滑下一张/右滑上一张
  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 80;
    if (info.offset.x < -threshold) goNext();
    else if (info.offset.x > threshold) goPrev();
  };

  return (
    <AnimatePresence>
      {open && photo && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={photo.alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          {/* 关闭按钮 */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {/* 左箭头 */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous photo"
              className="absolute left-4 z-10 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:left-6"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* 右箭头 */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Next photo"
              className="absolute right-4 z-10 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:right-6"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* 计数器 */}
          {photos.length > 1 && (
            <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white backdrop-blur">
              {(index ?? 0) + 1} / {photos.length}
            </div>
          )}

          {/* 主图 + 拖拽 */}
          <motion.div
            key={photo.src}
            className="relative mx-auto flex max-h-[90vh] max-w-[90vw] items-center justify-center"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              priority
              sizes="90vw"
              className="h-auto max-h-[80vh] w-auto rounded-md object-contain"
            />

            {/* 底部信息覆盖层 */}
            <figcaption
              className={cn(
                'absolute inset-x-0 bottom-0 rounded-b-md bg-gradient-to-t from-black/85 via-black/55 to-transparent p-4 text-white sm:p-5'
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium sm:text-base">
                  {photo.location ?? photo.alt}
                </p>
                <p className="font-mono text-[11px] text-white/70">
                  {photo.takenAt}
                </p>
              </div>
              {photo.story && (
                <p className="mt-1 text-xs text-white/80 sm:text-sm">
                  {photo.story[locale]}
                </p>
              )}
              {photo.exif && (
                <p className="mt-2 font-mono text-[10px] tracking-wider text-white/55 uppercase">
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
