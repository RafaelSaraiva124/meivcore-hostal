ALTER TABLE "room_history" ALTER COLUMN "guest1_checkin_date" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "guest1_checkin_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "room_history" ADD COLUMN "guest1_checkout_date" date;--> statement-breakpoint
ALTER TABLE "room_history" ADD COLUMN "guest2_checkout_date" date;--> statement-breakpoint
ALTER TABLE "Rooms" ADD COLUMN "guest1_checkout_date" date;--> statement-breakpoint
ALTER TABLE "Rooms" ADD COLUMN "guest2_checkout_date" date;--> statement-breakpoint
ALTER TABLE "room_history" DROP COLUMN "checkin_date";