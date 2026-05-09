CREATE TABLE "likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"target_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guestbook_messages" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "guestbook_messages" ADD COLUMN "post_slug" varchar(128);--> statement-breakpoint
ALTER TABLE "guestbook_messages" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "likes_unique_idx" ON "likes" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "likes_target_idx" ON "likes" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "guestbook_parent_idx" ON "guestbook_messages" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "guestbook_post_slug_idx" ON "guestbook_messages" USING btree ("post_slug");