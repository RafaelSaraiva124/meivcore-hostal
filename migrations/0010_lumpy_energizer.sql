CREATE TABLE "Rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" varchar(10) NOT NULL,
	"type" "type" NOT NULL,
	"status" "status" DEFAULT 'Free' NOT NULL,
	"company" varchar(100),
	"guest1_name" varchar(100),
	"guest1_phone" varchar(20),
	"guest1_checkin_date" date,
	"guest2_name" varchar(100),
	"guest2_phone" varchar(20),
	"guest2_checkin_date" date,
	CONSTRAINT "Rooms_id_unique" UNIQUE("id"),
	CONSTRAINT "Rooms_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "rooms" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "rooms" CASCADE;--> statement-breakpoint
ALTER TABLE "room_history" DROP CONSTRAINT "room_history_room_id_rooms_id_fk";
--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "room_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "guest1_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "created_by" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "updated_by" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "room_history" ADD COLUMN "checkin_date" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "room_history" ADD COLUMN "checkout_date" timestamp;--> statement-breakpoint
ALTER TABLE "room_history" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "room_history" ADD CONSTRAINT "room_history_room_id_Rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."Rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_history" DROP COLUMN "guest1_checkin_date";--> statement-breakpoint
ALTER TABLE "room_history" DROP COLUMN "guest1_checkout_date";--> statement-breakpoint
ALTER TABLE "room_history" DROP COLUMN "guest2_checkin_date";--> statement-breakpoint
ALTER TABLE "room_history" DROP COLUMN "guest2_checkout_date";