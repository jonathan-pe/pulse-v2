ALTER TABLE "pick" ADD COLUMN "settled_status" text;--> statement-breakpoint
ALTER TABLE "pick" ADD COLUMN "points" numeric;--> statement-breakpoint
ALTER TABLE "pick" ADD COLUMN "settled_at" timestamp with time zone;