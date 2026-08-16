ALTER TABLE "event" ALTER COLUMN "start_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "last_synced_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "last_synced_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "market" ALTER COLUMN "last_synced_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "market" ALTER COLUMN "last_synced_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "pick" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pick" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "pick" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pick" ALTER COLUMN "updated_at" SET DEFAULT now();