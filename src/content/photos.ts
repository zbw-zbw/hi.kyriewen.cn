export interface Photo {
  /** 图片 URL（先用 Unsplash 占位，后续替换为本地 /photos/xxx.jpg） */
  src: string;
  alt: string;
  /** 横纵比，用于 next/image 占位避免 CLS */
  width: number;
  height: number;
  location?: string;
  takenAt: string; // ISO date
  story?: { en: string; zh: string };
  exif?: {
    camera?: string;
    lens?: string;
    iso?: number;
    aperture?: string;
    shutter?: string;
  };
}

/**
 * 占位照片墙数据。等用户提供真实照片后，把 src 换成 `/photos/xxx.jpg`。
 * Unsplash URL 已带 ?w=1200&q=80 参数，避免拉超大原图。
 */
export const PHOTOS: Photo[] = [
  {
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    alt: 'Mountain lake at golden hour',
    width: 1200,
    height: 800,
    location: 'Banff, Canada',
    takenAt: '2024-09-12',
    story: {
      en: 'Hiked 4 hours before sunrise to catch this light.',
      zh: '日出前徒步 4 小时换来的光。',
    },
    exif: { camera: 'Sony α7 IV', lens: '24-70mm', iso: 100, aperture: 'f/8', shutter: '1/250s' },
  },
  {
    src: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
    alt: 'Forest path in morning fog',
    width: 1200,
    height: 800,
    location: 'Mt. Rainier, USA',
    takenAt: '2024-07-23',
    story: { en: 'Foggy morning, almost spiritual.', zh: '雾色清晨，近乎神性。' },
  },
  {
    src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
    alt: 'Beach with crystal clear water',
    width: 1200,
    height: 800,
    location: 'Phuket, Thailand',
    takenAt: '2024-03-08',
    story: { en: 'Off-season, no tourists.', zh: '淡季，没有游客。' },
  },
  {
    src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
    alt: 'Snow mountain reflection',
    width: 1200,
    height: 800,
    location: 'Patagonia, Chile',
    takenAt: '2023-11-15',
  },
  {
    src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80',
    alt: 'Norwegian fjord',
    width: 1200,
    height: 800,
    location: 'Geirangerfjord, Norway',
    takenAt: '2023-08-04',
  },
  {
    src: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=1200&q=80',
    alt: 'Lavender field',
    width: 1200,
    height: 800,
    location: 'Provence, France',
    takenAt: '2023-06-22',
  },
];

export function getPhotosByYear(): Array<{ year: number; photos: Photo[] }> {
  const byYear = new Map<number, Photo[]>();
  for (const photo of PHOTOS) {
    const year = new Date(photo.takenAt).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(photo);
  }
  return Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, photos]) => ({ year, photos }));
}
