ALTER TABLE "room_history" RENAME COLUMN "guest1_checkin_date" TO "checkin_date";--> statement-breakpoint
ALTER TABLE "Rooms" ALTER COLUMN "guest1_checkin_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "Rooms" ALTER COLUMN "guest2_checkin_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "room_history" DROP COLUMN "guest2_checkin_date";