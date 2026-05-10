-- Migration: Add source tracking fields to blog_posts
-- Run this in Neon Console SQL Editor

ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "source" varchar(32);
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "source_id" varchar(256);
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "source_url" text;

CREATE INDEX IF NOT EXISTS "blog_posts_source_id_idx" ON "blog_posts" USING btree ("source_id");
