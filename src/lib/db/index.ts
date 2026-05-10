import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

neonConfig.fetchConnectionCache = true;

const rawUrl =
  process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? '';

const sql = neon(
  rawUrl || 'postgresql://placeholder:placeholder@localhost/placeholder'
);

export const db = drizzle(sql, { schema });
export { schema };
export * from './schema';
