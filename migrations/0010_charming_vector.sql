CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"guest1_name" text,
	"guest1_phone" text,
	"guest2_name" text,
	"guest2_phone" text,
	"company" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "Rooms" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "Rooms" CASCADE;--> statement-breakpoint
ALTER TABLE "room_history" DROP CONSTRAINT "room_history_room_id_Rooms_id_fk";
--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "room_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "guest1_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "updated_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "room_history" ADD COLUMN "guest1_checkin_date" timestamp;--> statement-breakpoint
ALTER TABLE "room_history" ADD COLUMN "guest1_checkout_date" timestamp;--> statement-breakpoint
ALTER TABLE "room_history" ADD COLUMN "guest2_checkin_date" timestamp;--> statement-breakpoint
ALTER TABLE "room_history" ADD COLUMN "guest2_checkout_date" timestamp;--> statement-breakpoint
ALTER TABLE "room_history" ADD CONSTRAINT "room_history_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_history" DROP COLUMN "checkin_date";--> statement-breakpoint
ALTER TABLE "room_history" DROP COLUMN "checkout_date";--> statement-breakpoint
ALTER TABLE "room_history" DROP COLUMN "notes";