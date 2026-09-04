import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const classStatusEnum = pgEnum("class_status", [
  "active",
  "inactive",
  "archived",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
]);

export const reportTypeEnum = pgEnum("report_type", [
  "performance",
  "incident",
  "progress",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "draft",
  "submitted",
  "reviewed",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "class_started",
  "assignment_published",
  "assignment_deadline",
  "assignment_graded",
  "assessment_available",
  "assessment_completed",
  "announcement",
  "schedule_change",
  "teacher_added",
  "code_shared",
]);

export const departments = pgTable("departments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  ...timestamps,
});

export const subjects = pgTable(
  "subjects",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    
    teacherId: text("teacher_id")
      .references(() => user.id, { onDelete: "restrict" }),

    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: text("description"),

    ...timestamps,
  },
  (table) => ({
    teacherIdIdx: index("subjects_teacher_id_idx").on(table.teacherId),
  })
);

export const classes = pgTable(
  "classes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),

    inviteCode: varchar("invite_code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    bannerCldPubId: text("banner_cld_pub_id"),
    bannerUrl: text("banner_url"),
    capacity: integer("capacity").notNull().default(50),
    description: text("description"),
    status: classStatusEnum("status").notNull().default("active"),

    ...timestamps,
  },
  (table) => ({
    subjectIdIdx: index("classes_subject_id_idx").on(table.subjectId),
    teacherIdIdx: index("classes_teacher_id_idx").on(table.teacherId),
  })
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),

    ...timestamps,
  },
  (table) => ({
    studentIdIdx: index("enrollments_student_id_idx").on(table.studentId),
    classIdIdx: index("enrollments_class_id_idx").on(table.classId),
    studentClassUnique: index("enrollments_student_class_unique").on(
      table.studentId,
      table.classId
    ),
  })
);

export const registrationCodes = pgTable(
  "registration_codes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: varchar("code", { length: 100 }).notNull().unique(),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at"),
    usageLimit: integer("usage_limit"),
    usesCount: integer("uses_count").default(0).notNull(),
    active: boolean("active").default(true).notNull(),

    ...timestamps,
  },
  (table) => ({
    classIdIdx: index("registration_codes_class_id_idx").on(table.classId),
    teacherIdIdx: index("registration_codes_teacher_id_idx").on(table.teacherId),
    subjectIdIdx: index("registration_codes_subject_id_idx").on(table.subjectId),
  })
);

// ===== ASSIGNMENTS =====

export const assignments = pgTable(
  "assignments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    dueDate: timestamp("due_date"),
    points: integer("points").notNull().default(100),
    isPublished: boolean("is_published").notNull().default(false),

    ...timestamps,
  },
  (table) => ({
    classIdIdx: index("assignments_class_id_idx").on(table.classId),
    teacherIdIdx: index("assignments_teacher_id_idx").on(table.teacherId),
  })
);

export const submissions = pgTable(
  "submissions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content"),
    submittedAt: timestamp("submitted_at"),
    isLate: boolean("is_late").notNull().default(false),

    ...timestamps,
  },
  (table) => ({
    assignmentIdIdx: index("submissions_assignment_id_idx").on(table.assignmentId),
    studentIdIdx: index("submissions_student_id_idx").on(table.studentId),
    assignmentStudentUnique: index("submissions_assignment_student_unique").on(
      table.assignmentId,
      table.studentId
    ),
  })
);

export const grades = pgTable(
  "grades",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    submissionId: integer("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    score: integer("score").notNull(),
    feedback: text("feedback"),
    gradedAt: timestamp("graded_at").notNull().defaultNow(),

    ...timestamps,
  },
  (table) => ({
    submissionIdIdx: index("grades_submission_id_idx").on(table.submissionId),
    teacherIdIdx: index("grades_teacher_id_idx").on(table.teacherId),
  })
);

// ===== ASSESSMENTS =====

export const assessments = pgTable(
  "assessments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    questions: jsonb("questions"),
    points: integer("points").notNull().default(100),
    isPublished: boolean("is_published").notNull().default(false),

    ...timestamps,
  },
  (table) => ({
    classIdIdx: index("assessments_class_id_idx").on(table.classId),
    teacherIdIdx: index("assessments_teacher_id_idx").on(table.teacherId),
  })
);

export const assessmentResults = pgTable(
  "assessment_results",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    responses: jsonb("responses"),
    score: integer("score"),
    submittedAt: timestamp("submitted_at"),

    ...timestamps,
  },
  (table) => ({
    assessmentIdIdx: index("assessment_results_assessment_id_idx").on(
      table.assessmentId
    ),
    studentIdIdx: index("assessment_results_student_id_idx").on(table.studentId),
    assessmentStudentUnique: index("assessment_results_assessment_student_unique").on(
      table.assessmentId,
      table.studentId
    ),
  })
);

// ===== ATTENDANCE =====

export const attendance = pgTable(
  "attendance",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    status: attendanceStatusEnum("status").notNull().default("present"),
    remarks: text("remarks"),

    ...timestamps,
  },
  (table) => ({
    classIdIdx: index("attendance_class_id_idx").on(table.classId),
    studentIdIdx: index("attendance_student_id_idx").on(table.studentId),
    dateIdx: index("attendance_date_idx").on(table.date),
    attendanceUnique: index("attendance_class_student_date_unique").on(
      table.classId,
      table.studentId,
      table.date
    ),
  })
);

// ===== SESSIONS =====

export const sessions = pgTable(
  "sessions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),
    isLive: boolean("is_live").notNull().default(true),

    ...timestamps,
  },
  (table) => ({
    classIdIdx: index("sessions_class_id_idx").on(table.classId),
  })
);

// ===== REPORTS =====

export const reports = pgTable(
  "reports",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    type: reportTypeEnum("type").notNull().default("performance"),
    status: reportStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at"),
    reviewedAt: timestamp("reviewed_at"),

    ...timestamps,
  },
  (table) => ({
    teacherIdIdx: index("reports_teacher_id_idx").on(table.teacherId),
    studentIdIdx: index("reports_student_id_idx").on(table.studentId),
    classIdIdx: index("reports_class_id_idx").on(table.classId),
  })
);

// ===== NOTIFICATIONS =====

export const notifications = pgTable(
  "notifications",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255}),
    message: text("message"),
    type: notificationTypeEnum("type").notNull(),
    relatedId: integer("related_id"),
    isRead: boolean("is_read").notNull().default(false),

    ...timestamps,
  },
  (table) => ({
    userIdIdx: index("notifications_user_id_idx").on(table.userId),
    isReadIdx: index("notifications_is_read_idx").on(table.isRead),
  })
);

export const departmentsRelations = relations(departments, ({ many }) => ({
  subjects: many(subjects),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  department: one(departments, {
    fields: [subjects.departmentId],
    references: [departments.id],
  }),
  teacher: one(user, {
    fields: [subjects.teacherId],
    references: [user.id],
  }),
  classes: many(classes),
  registrationCodes: many(registrationCodes),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [classes.subjectId],
    references: [subjects.id],
  }),
  teacher: one(user, {
    fields: [classes.teacherId],
    references: [user.id],
  }),
  enrollments: many(enrollments),
  assignments: many(assignments),
  assessments: many(assessments),
  attendance: many(attendance),
  sessions: many(sessions),
  reports: many(reports),
  registrationCodes: many(registrationCodes),
}));

export const registrationCodesRelations = relations(registrationCodes, ({ one }) => ({
  class: one(classes, {
    fields: [registrationCodes.classId],
    references: [classes.id],
  }),
  teacher: one(user, {
    fields: [registrationCodes.teacherId],
    references: [user.id],
  }),
  subject: one(subjects, {
    fields: [registrationCodes.subjectId],
    references: [subjects.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(user, {
    fields: [enrollments.studentId],
    references: [user.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
}));

// ===== ASSIGNMENT RELATIONS =====

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  class: one(classes, {
    fields: [assignments.classId],
    references: [classes.id],
  }),
  teacher: one(user, {
    fields: [assignments.teacherId],
    references: [user.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(user, {
    fields: [submissions.studentId],
    references: [user.id],
  }),
  grade: many(grades),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  submission: one(submissions, {
    fields: [grades.submissionId],
    references: [submissions.id],
  }),
  teacher: one(user, {
    fields: [grades.teacherId],
    references: [user.id],
  }),
}));

// ===== ASSESSMENT RELATIONS =====

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  class: one(classes, {
    fields: [assessments.classId],
    references: [classes.id],
  }),
  teacher: one(user, {
    fields: [assessments.teacherId],
    references: [user.id],
  }),
  results: many(assessmentResults),
}));

export const assessmentResultsRelations = relations(assessmentResults, ({ one }) => ({
  assessment: one(assessments, {
    fields: [assessmentResults.assessmentId],
    references: [assessments.id],
  }),
  student: one(user, {
    fields: [assessmentResults.studentId],
    references: [user.id],
  }),
}));

// ===== ATTENDANCE RELATIONS =====

export const attendanceRelations = relations(attendance, ({ one }) => ({
  class: one(classes, {
    fields: [attendance.classId],
    references: [classes.id],
  }),
  student: one(user, {
    fields: [attendance.studentId],
    references: [user.id],
  }),
}));

// ===== SESSION RELATIONS =====

export const classSessionsRelations = relations(sessions, ({ one }) => ({
  class: one(classes, {
    fields: [sessions.classId],
    references: [classes.id],
  }),
}));

// ===== REPORT RELATIONS =====

export const reportsRelations = relations(reports, ({ one }) => ({
  teacher: one(user, {
    fields: [reports.teacherId],
    references: [user.id],
  }),
  student: one(user, {
    fields: [reports.studentId],
    references: [user.id],
  }),
  class: one(classes, {
    fields: [reports.classId],
    references: [classes.id],
  }),
}));

// ===== NOTIFICATION RELATIONS =====

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
}));

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

export type RegistrationCode = typeof registrationCodes.$inferSelect;
export type NewRegistrationCode = typeof registrationCodes.$inferInsert;

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;

export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;

export type AssessmentResult = typeof assessmentResults.$inferSelect;
export type NewAssessmentResult = typeof assessmentResults.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;


