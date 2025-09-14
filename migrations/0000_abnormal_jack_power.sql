CREATE TYPE "public"."role" AS ENUM('Dev', 'Admin', 'worker');--> statement-breakpoint
CREATE TYPE "public"."type" AS ENUM('single', 'double');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('Dirty', 'Free', 'Ocupied');--> statement-breakpoint
CREATE TABLE "Rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" varchar(10) NOT NULL,
	"type" "type" NOT NULL,
	"status" "status" DEFAULT 'Free',
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "role" DEFAULT 'worker',
	CONSTRAINT "users_id_unique" UNIQUE("id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
