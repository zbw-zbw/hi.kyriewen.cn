CREATE TABLE IF NOT EXISTS "newsletter_issues" (
  "id" serial PRIMARY KEY NOT NULL,
  "subject" varchar(512) NOT NULL,
  "preview_text" text,
  "html_content" text NOT NULL,
  "sent_at" timestamp with time zone,
  "recipient_count" integer NOT NULL DEFAULT 0,
  "resend_broadcast_id" varchar(128),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "newsletter_issues_sent_idx" ON "newsletter_issues" USING btree ("sent_at");
