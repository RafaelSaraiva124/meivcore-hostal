ALTER TABLE "room_history" ALTER COLUMN "guest1_checkin_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "room_history" ALTER COLUMN "guest2_checkin_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "Rooms" ALTER COLUMN "guest1_checkin_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "Rooms" ALTER COLUMN "guest2_checkin_date" SET DATA TYPE timestamp;