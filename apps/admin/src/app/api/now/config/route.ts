import { NextResponse } from 'next/server';
import { db } from '@repo/db';
import { nowConfig } from '@repo/db/schema';

const VALID_KEYS = [
  'updated_at',
  'currently_building_en',
  'currently_building_zh',
] as const;

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const results = await Promise.all(
      VALID_KEYS.map(async (key) => {
        const value = body[key];
        if (value === undefined) return null;

        const [row] = await db
          .insert(nowConfig)
          .values({ key, value: String(value) })
          .onConflictDoUpdate({
            target: nowConfig.key,
            set: { value: String(value), updatedAt: new Date() },
          })
          .returning();

        return row;
      }),
    );

    return NextResponse.json(results.filter(Boolean));
  } catch (error) {
    console.error('Failed to update now config:', error);
    return NextResponse.json(
      { error: 'Failed to update now config' },
      { status: 500 },
    );
  }
}
