CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late');
--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('performance', 'incident', 'progress');
--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('draft', 'submitted', 'reviewed');
--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('class_started', 'assignment_published', 'assignment_deadline', 'assignment_graded', 'assessment_available', 'assessment_completed', 'announcement', 'schedule_change', 'teacher_added', 'code_shared');
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "teacher_id" text;
--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"class_id" integer NOT NULL,
	"teacher_id" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"due_date" timestamp,
	"points" integer DEFAULT 100 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submissions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "submissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"assignment_id" integer NOT NULL,
	"student_id" text NOT NULL,
	"content" text,
	"submitted_at" timestamp,
	"is_late" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grades" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "grades_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"submission_id" integer NOT NULL,
	"teacher_id" text NOT NULL,
	"score" integer NOT NULL,
	"feedback" text,
	"graded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assessments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"class_id" integer NOT NULL,
	"teacher_id" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"questions" jsonb,
	"points" integer DEFAULT 100 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_results" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assessment_results_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"assessment_id" integer NOT NULL,
	"student_id" text NOT NULL,
	"responses" jsonb,
	"score" integer,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "attendance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"class_id" integer NOT NULL,
	"student_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"status" "public"."attendance_status" DEFAULT 'present' NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"class_id" integer NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"is_live" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"teacher_id" text NOT NULL,
	"student_id" text NOT NULL,
	"class_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"type" "public"."report_type" DEFAULT 'performance' NOT NULL,
	"status" "public"."report_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"title" varchar(255),
	"message" text,
	"type" "public"."notification_type" NOT NULL,
	"related_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX "subjects_teacher_id_idx" ON "subjects" ("teacher_id");
--> statement-breakpoint
CREATE INDEX "assignments_class_id_idx" ON "assignments" ("class_id");
--> statement-breakpoint
CREATE INDEX "assignments_teacher_id_idx" ON "assignments" ("teacher_id");
--> statement-breakpoint
CREATE INDEX "submissions_assignment_id_idx" ON "submissions" ("assignment_id");
--> statement-breakpoint
CREATE INDEX "submissions_student_id_idx" ON "submissions" ("student_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_assignment_student_unique" ON "submissions" ("assignment_id","student_id");
--> statement-breakpoint
CREATE INDEX "grades_submission_id_idx" ON "grades" ("submission_id");
--> statement-breakpoint
CREATE INDEX "grades_teacher_id_idx" ON "grades" ("teacher_id");
--> statement-breakpoint
CREATE INDEX "assessments_class_id_idx" ON "assessments" ("class_id");
--> statement-breakpoint
CREATE INDEX "assessments_teacher_id_idx" ON "assessments" ("teacher_id");
--> statement-breakpoint
CREATE INDEX "assessment_results_assessment_id_idx" ON "assessment_results" ("assessment_id");
--> statement-breakpoint
CREATE INDEX "assessment_results_student_id_idx" ON "assessment_results" ("student_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_results_assessment_student_unique" ON "assessment_results" ("assessment_id","student_id");
--> statement-breakpoint
CREATE INDEX "attendance_class_id_idx" ON "attendance" ("class_id");
--> statement-breakpoint
CREATE INDEX "attendance_student_id_idx" ON "attendance" ("student_id");
--> statement-breakpoint
CREATE INDEX "attendance_date_idx" ON "attendance" ("date");
--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_class_student_date_unique" ON "attendance" ("class_id","student_id","date");
--> statement-breakpoint
CREATE INDEX "sessions_class_id_idx" ON "sessions" ("class_id");
--> statement-breakpoint
CREATE INDEX "reports_teacher_id_idx" ON "reports" ("teacher_id");
--> statement-breakpoint
CREATE INDEX "reports_student_id_idx" ON "reports" ("student_id");
--> statement-breakpoint
CREATE INDEX "reports_class_id_idx" ON "reports" ("class_id");
--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" ("user_id");
--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" ("is_read");
