import {
  varchar,
  uuid,
  integer,
  text,
  boolean,
  pgTable,
} from "drizzle-orm/pg-core";
import { date } from "drizzle-orm/pg-core/columns/date";
import { pgEnum } from "drizzle-orm/pg-core/columns/enum";

export const STATUS_ENUM = pgEnum("status", ["Dirty", "Free", "Ocupied"]);
export const ROLE_ENUM = pgEnum("role", ["Dev", "Admin", "Worker", "Pending"]);
export const ROOM_TYPE_ENUM = pgEnum("type", ["single", "double"]);

export const users = pgTable("users", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: text("email").notNull().unique(),
  password: text().notNull(),
  role: ROLE_ENUM("role").default("Pending"),
});

export const Rooms = pgTable("Rooms", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  number: varchar("number", { length: 10 }).notNull().unique(),
  type: ROOM_TYPE_ENUM("type").notNull(),
  status: STATUS_ENUM("status").default("Free"),

  // Informações do hóspede 1
  guest1Name: varchar("guest1_name", { length: 100 }),
  guest1Phone: varchar("guest1_phone", { length: 20 }),
  guest1CheckinDate: date("guest1_checkin_date"),

  // Informações do hóspede 2
  guest2Name: varchar("guest2_name", { length: 100 }),
  guest2Phone: varchar("guest2_phone", { length: 20 }),
  guest2CheckinDate: date("guest2_checkin_date"),
});
