CREATE TABLE "i18n_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"locale" varchar(8) NOT NULL,
	"namespace" varchar(64) NOT NULL,
	"key" varchar(256) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "navigation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"href" text NOT NULL,
	"key" varchar(64) NOT NULL,
	"label_en" varchar(128) DEFAULT '' NOT NULL,
	"label_zh" varchar(128) DEFAULT '' NOT NULL,
	"visible" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" varchar(512) NOT NULL,
	"preview_text" text,
	"html_content" text NOT NULL,
	"sent_at" timestamp with time zone,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"resend_broadcast_id" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "product_stats_slug_date_idx";--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "source" varchar(32);--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "source_id" varchar(256);--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "source_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "i18n_locale_ns_key_idx" ON "i18n_messages" USING btree ("locale","namespace","key");--> statement-breakpoint
CREATE INDEX "i18n_locale_idx" ON "i18n_messages" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "navigation_items_sort_idx" ON "navigation_items" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "newsletter_issues_sent_idx" ON "newsletter_issues" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "blog_posts_source_id_idx" ON "blog_posts" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "product_stats_slug_date_lookup_idx" ON "product_stats" USING btree ("slug","date");--> statement-breakpoint
CREATE UNIQUE INDEX "product_stats_slug_date_idx" ON "product_stats" USING btree ("slug","date");