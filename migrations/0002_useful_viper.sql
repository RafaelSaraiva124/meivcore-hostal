CREATE TABLE "room_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"room_number" text NOT NULL,
	"guest1_name" text NOT NULL,
	"guest1_phone" text,
	"guest2_name" text,
	"guest2_phone" text,
	"checkin_date" timestamp DEFAULT now() NOT NULL,
	"checkout_date" timestamp,
	"total_amount" numeric(10, 2),
	"room_type" text NOT NULL,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room_history" ADD CONSTRAINT "room_history_room_id_Rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."Rooms"("id") ON DELETE no action ON UPDATE no action;