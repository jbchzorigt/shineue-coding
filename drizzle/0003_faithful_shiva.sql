ALTER TABLE "challenges" DROP CONSTRAINT "challenges_type_check";--> statement-breakpoint
ALTER TABLE "challenge_answers" ADD COLUMN "expected_table" jsonb;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "logic_spec" jsonb;--> statement-breakpoint
ALTER TABLE "contest_problem_answers" ADD COLUMN "expected_table" jsonb;--> statement-breakpoint
ALTER TABLE "contest_problems" ADD COLUMN "kind" text DEFAULT 'python' NOT NULL;--> statement-breakpoint
ALTER TABLE "contest_problems" ADD COLUMN "logic_spec" jsonb;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_type_check" CHECK ("challenges"."type" in ('mcq', 'tracing', 'coding', 'theory', 'logic'));--> statement-breakpoint
ALTER TABLE "contest_problems" ADD CONSTRAINT "contest_problems_kind_check" CHECK ("contest_problems"."kind" in ('python', 'logic'));