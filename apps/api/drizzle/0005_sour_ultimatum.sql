ALTER TABLE "event" ADD COLUMN "is_live" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "record" text;