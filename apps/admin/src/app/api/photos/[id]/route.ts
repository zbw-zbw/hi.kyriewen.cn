import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import { photos } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      src,
      alt,
      width,
      height,
      location,
      takenAt,
      storyEn,
      storyZh,
      exif,
      sortOrder,
    } = body as {
      src?: string;
      alt?: string;
      width?: number;
      height?: number;
      location?: string | null;
      takenAt?: string;
      storyEn?: string | null;
      storyZh?: string | null;
      exif?: string | null;
      sortOrder?: number;
    };

    const [updated] = await db
      .update(photos)
      .set({
        ...(src !== undefined && { src }),
        ...(alt !== undefined && { alt }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(location !== undefined && { location }),
        ...(takenAt !== undefined && { takenAt }),
        ...(storyEn !== undefined && { storyEn }),
        ...(storyZh !== undefined && { storyZh }),
        ...(exif !== undefined && { exif }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
      })
      .where(eq(photos.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update photo:', error);
    return NextResponse.json(
      { error: 'Failed to update photo' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(photos)
      .where(eq(photos.id, Number(id)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete photo:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 },
    );
  }
}
