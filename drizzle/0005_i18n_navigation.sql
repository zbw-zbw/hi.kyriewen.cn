-- Migration: Add navigation_items and i18n_messages tables

CREATE TABLE IF NOT EXISTS "navigation_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "href" text NOT NULL,
  "key" varchar(64) NOT NULL,
  "visible" integer DEFAULT 1 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "navigation_items_sort_idx" ON "navigation_items" ("sort_order");

CREATE TABLE IF NOT EXISTS "i18n_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "locale" varchar(8) NOT NULL,
  "namespace" varchar(64) NOT NULL,
  "key" varchar(256) NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "i18n_locale_ns_key_idx" ON "i18n_messages" ("locale", "namespace", "key");
CREATE INDEX IF NOT EXISTS "i18n_locale_idx" ON "i18n_messages" ("locale");
