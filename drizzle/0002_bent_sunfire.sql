CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(256) NOT NULL,
	"title" varchar(512) NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"tags" text DEFAULT '[]' NOT NULL,
	"lang" varchar(8) DEFAULT 'en' NOT NULL,
	"draft" integer DEFAULT 1 NOT NULL,
	"cover_image" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "now_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(64) NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "now_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "now_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"label_en" varchar(256) NOT NULL,
	"label_zh" varchar(256) NOT NULL,
	"value_en" text NOT NULL,
	"value_zh" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(256) NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_views_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"src" text NOT NULL,
	"alt" varchar(512) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"location" varchar(256),
	"taken_at" date NOT NULL,
	"story_en" text,
	"story_zh" text,
	"exif" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "popular_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(256) NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"trend" varchar(16),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "popular_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(256) NOT NULL,
	"category" varchar(32) NOT NULL,
	"tagline_en" text DEFAULT '' NOT NULL,
	"tagline_zh" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_zh" text DEFAULT '' NOT NULL,
	"stack" text DEFAULT '[]' NOT NULL,
	"repo" text,
	"live" text,
	"chrome_store_id" varchar(64),
	"featured" integer DEFAULT 0 NOT NULL,
	"pinned" integer DEFAULT 0 NOT NULL,
	"year" integer NOT NULL,
	"accent" varchar(32),
	"hero_image" text,
	"gallery" text,
	"cover_video" text,
	"case_study_en" text,
	"case_study_zh" text,
	"color_theme" varchar(32),
	"metrics" text,
	"changelog" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"href" text NOT NULL,
	"icon_name" varchar(64) NOT NULL,
	"handle" varchar(256),
	"is_email" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"title_en" varchar(512) NOT NULL,
	"title_zh" varchar(512) NOT NULL,
	"description_en" text,
	"description_zh" text,
	"type" varchar(32) NOT NULL,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uses_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"url" text,
	"note_en" text DEFAULT '' NOT NULL,
	"note_zh" text DEFAULT '' NOT NULL,
	"rating" integer,
	"verdict_en" text,
	"verdict_zh" text,
	"since" varchar(10),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uses_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" varchar(64) NOT NULL,
	"title_en" varchar(256) NOT NULL,
	"title_zh" varchar(256) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uses_sections_section_id_unique" UNIQUE("section_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_lang_idx" ON "blog_posts" USING btree ("slug","lang");--> statement-breakpoint
CREATE INDEX "blog_posts_lang_idx" ON "blog_posts" USING btree ("lang");--> statement-breakpoint
CREATE INDEX "blog_posts_published_idx" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "now_items_sort_idx" ON "now_items" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "page_views_slug_idx" ON "page_views" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "photos_sort_idx" ON "photos" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_sort_idx" ON "projects" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "social_links_sort_idx" ON "social_links" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "timeline_date_idx" ON "timeline_events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "uses_items_section_idx" ON "uses_items" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "uses_items_sort_idx" ON "uses_items" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "uses_sections_sort_idx" ON "uses_sections" USING btree ("sort_order");