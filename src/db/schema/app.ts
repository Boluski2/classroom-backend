import { relations } from "drizzle-orm";
import { integer, pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

// This file defines the database schema for the application using Drizzle ORM's PostgreSQL core. We have two main tables: departments and subjects, with a one-to-many relationship between them. Each table includes fields for code, name, description, and timestamps for tracking creation and updates. Unique constraints ensure data integrity, and foreign key relationships maintain referential integrity between departments and subjects.
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
};

// Departments are the top-level organizational units, and subjects belong to departments. We use unique constraints on code and name to ensure data integrity, and we include timestamps for tracking creation and updates.
export const departments = pgTable("departments", {
  id: integer ("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  ...timestamps
});


// Subjects belong to a department, so we have a foreign key reference to departments.id with onDelete: "restrict" to prevent deleting a department that has subjects.
export const subject = pgTable("subject", {
  id: integer ("id").primaryKey().generatedAlwaysAsIdentity(),
  departmentsId: integer("departmentId").notNull().references(() => departments.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  ...timestamps
});


// Relations to enable easy joins and nested queries with Drizzle ORM's relation helpers 
export const departmentRelations = relations(departments, ({ many }) => ({
  subjects: many(subject)
}));

// subjectRelations defines the relationship from the subject's perspective, allowing us to easily access the associated department for each subject. The foreign key relationship is defined with fields and references to ensure referential integrity.
export const subjectRelations = relations(subject, ({ one }) => ({
  department: one(departments, {
    fields: [subject.departmentsId],
    references: [departments.id]
  })
}));

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Subject = typeof subject.$inferSelect;
export type NewSubject = typeof subject.$inferInsert;