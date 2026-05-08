CREATE TABLE "guestbook_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	"avatar" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"date" date NOT NULL,
	"users" integer DEFAULT 0 NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stats_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"github_stars" integer DEFAULT 0 NOT NULL,
	"github_followers" integer DEFAULT 0 NOT NULL,
	"chrome_total_users" integer DEFAULT 0 NOT NULL,
	"newsletter_subscribers" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stats_snapshot_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE INDEX "guestbook_created_idx" ON "guestbook_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_stats_slug_date_idx" ON "product_stats" USING btree ("slug","date");--> statement-breakpoint
CREATE INDEX "stats_date_idx" ON "stats_snapshot" USING btree ("date");