import { pgTable, serial, text, timestamp, integer, jsonb, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const attempts = pgTable("attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  mode: text("mode").notNull(),
  paper: integer("paper").notNull(),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userState = pgTable("user_state", {
  userId: integer("user_id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
