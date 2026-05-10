import { db } from '@repo/db';
import { photos } from '@repo/db/schema';
import { asc } from 'drizzle-orm';
import { PhotosManager } from './photos-manager';

export default async function PhotosPage() {
  const allPhotos = await db
    .select()
    .from(photos)
    .orderBy(asc(photos.sortOrder));

  return <PhotosManager initialPhotos={allPhotos} />;
}
