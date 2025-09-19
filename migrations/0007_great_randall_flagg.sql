ALTER TABLE "room_history" RENAME COLUMN "checkin_date" TO "guest1_checkin_date";--> statement-breakpoint
ALTER TABLE "room_history" ADD COLUMN "guest2_checkin_date" date;