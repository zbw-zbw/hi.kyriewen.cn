import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import { photos } from '@repo/db/schema';
import { asc } from 'drizzle-orm';
import { triggerRevalidation } from '@/lib/revalidate';

export async function GET() {
  try {
    const allPhotos = await db.select().from(photos).orderBy(asc(photos.sortOrder));

    return NextResponse.json(allPhotos);
  } catch (error) {
    console.error('Failed to fetch photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { src, alt, width, height, location, takenAt, storyEn, storyZh, exif, sortOrder } =
      body as {
        src: string;
        alt: string;
        width: number;
        height: number;
        location?: string;
        takenAt: string;
        storyEn?: string;
        storyZh?: string;
        exif?: string;
        sortOrder?: number;
      };

    if (!src || !alt || !width || !height || !takenAt) {
      return NextResponse.json(
        { error: 'src, alt, width, height, and takenAt are required' },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(photos)
      .values({
        src,
        alt,
        width,
        height,
        location: location ?? null,
        takenAt,
        storyEn: storyEn ?? null,
        storyZh: storyZh ?? null,
        exif: exif ?? null,
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    // Trigger main site cache invalidation (non-blocking)
    triggerRevalidation(['/photos']).catch(() => {});

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create photo:', error);
    return NextResponse.json({ error: 'Failed to create photo' }, { status: 500 });
  }
}
