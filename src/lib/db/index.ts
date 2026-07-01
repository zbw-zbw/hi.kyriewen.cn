// Re-export from the shared @repo/db package.
// This file exists only for backward compatibility so existing
// `@/lib/db` imports don't need to change.
export { db, schema } from '@repo/db';
export * from '@repo/db';
