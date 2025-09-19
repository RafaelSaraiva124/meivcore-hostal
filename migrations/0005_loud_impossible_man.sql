ALTER TABLE "Rooms" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "Rooms" ALTER COLUMN "status" SET DEFAULT 'Free'::text;--> statement-breakpoint
DROP TYPE "public"."status";--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('Dirty', 'Free', 'Occupied');--> statement-breakpoint
ALTER TABLE "Rooms" ALTER COLUMN "status" SET DEFAULT 'Free'::"public"."status";--> statement-breakpoint
ALTER TABLE "Rooms" ALTER COLUMN "status" SET DATA TYPE "public"."status" USING "status"::"public"."status";