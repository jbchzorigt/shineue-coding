ALTER TABLE "contests" ADD COLUMN "series" text;--> statement-breakpoint
ALTER TABLE "contests" ADD COLUMN "grade_min" integer;--> statement-breakpoint
ALTER TABLE "contests" ADD COLUMN "grade_max" integer;--> statement-breakpoint
ALTER TABLE "contests" ADD CONSTRAINT "contests_grade_range_check" CHECK (("contests"."grade_min" is null and "contests"."grade_max" is null) or ("contests"."grade_min" between 1 and 12 and "contests"."grade_max" between "contests"."grade_min" and 12));