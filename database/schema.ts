// database/schema.ts - Versão corrigida
import { varchar, uuid, text, pgTable, timestamp } from "drizzle-orm/pg-core";
import { date } from "drizzle-orm/pg-core/columns/date";
import { pgEnum } from "drizzle-orm/pg-core/columns/enum";

export const STATUS_ENUM = pgEnum("status", ["Dirty", "Free", "Occupied"]);
export const ROLE_ENUM = pgEnum("role", ["Dev", "Admin", "Worker", "Pending"]);
export const ROOM_TYPE_ENUM = pgEnum("type", ["single", "double"]);

export const users = pgTable("users", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: text("email").notNull().unique(),
  password: text().notNull(),
  role: ROLE_ENUM("role").notNull().default("Pending"),
});

export const Rooms = pgTable("Rooms", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  number: varchar("number", { length: 10 }).notNull().unique(),
  type: ROOM_TYPE_ENUM("type").notNull(),
  status: STATUS_ENUM("status").notNull().default("Free"),
  company: varchar("company", { length: 100 }),

  // Informações do hóspede 1
  guest1Name: varchar("guest1_name", { length: 100 }),
  guest1Phone: varchar("guest1_phone", { length: 20 }),
  guest1CheckinDate: date("guest1_checkin_date"),

  // Informações do hóspede 2
  guest2Name: varchar("guest2_name", { length: 100 }),
  guest2Phone: varchar("guest2_phone", { length: 20 }),
  guest2CheckinDate: date("guest2_checkin_date"),
});

export const RoomHistory = pgTable("room_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => Rooms.id),
  roomNumber: text("room_number").notNull(),
  companyName: text("company_name"),

  guest1Name: text("guest1_name").notNull(),
  guest1Phone: text("guest1_phone"),
  guest1CheckinDate: date("guest1_checkin_date").defaultNow().notNull(),

  guest2Name: text("guest2_name"),
  guest2Phone: text("guest2_phone"),
  guest2CheckinDate: date("guest2_checkin_date"),

  checkoutDate: timestamp("checkout_date"),

  roomType: text("room_type").notNull(), // "single" | "double"

  notes: text("notes"),

  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
