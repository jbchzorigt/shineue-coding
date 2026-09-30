CREATE TABLE "certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"name" text NOT NULL,
	"syllabus" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "challenge_answers" (
	"challenge_id" text PRIMARY KEY NOT NULL,
	"hidden_test_cases" jsonb,
	"hint" text,
	"correct_answer_index" integer,
	"expected_answer" text,
	"mark_scheme" text
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"xp_reward" integer NOT NULL,
	"order" integer NOT NULL,
	"language" text,
	"starter_code" text,
	"public_test_cases" jsonb,
	"options" jsonb,
	"has_hint" boolean,
	CONSTRAINT "challenges_type_check" CHECK ("challenges"."type" in ('mcq', 'tracing', 'coding', 'theory'))
);
--> statement-breakpoint
CREATE TABLE "contest_participants" (
	"contest_id" text NOT NULL,
	"uid" text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"last_improved_at" timestamp with time zone,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contest_participants_contest_id_uid_pk" PRIMARY KEY("contest_id","uid")
);
--> statement-breakpoint
CREATE TABLE "contest_problem_answers" (
	"contest_id" text NOT NULL,
	"problem_id" text NOT NULL,
	"hidden_test_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "contest_problem_answers_contest_id_problem_id_pk" PRIMARY KEY("contest_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE "contest_problems" (
	"contest_id" text NOT NULL,
	"id" text NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"order" integer NOT NULL,
	"points" integer NOT NULL,
	"starter_code" text,
	"public_test_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "contest_problems_contest_id_id_pk" PRIMARY KEY("contest_id","id")
);
--> statement-breakpoint
CREATE TABLE "contest_submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"contest_id" text NOT NULL,
	"uid" text NOT NULL,
	"problem_id" text NOT NULL,
	"code" text NOT NULL,
	"score" integer NOT NULL,
	"passed_tests" integer NOT NULL,
	"total_tests" integer NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contests" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" text PRIMARY KEY NOT NULL,
	"syllabus_ref" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"lesson_mdx" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body_mdx" text NOT NULL,
	"image_url" text,
	"video_url" text,
	"audio_url" text,
	"author_name" text,
	"author_uid" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"uid" text NOT NULL,
	"challenge_id" text NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"code_snapshot" text DEFAULT '' NOT NULL,
	"hint_used" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_uid_challenge_id_pk" PRIMARY KEY("uid","challenge_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"uid" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"photo_url" text,
	"role" text DEFAULT 'student' NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"unlocked_modules" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('student', 'teacher', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_answers" ADD CONSTRAINT "challenge_answers_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_contest_id_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_problem_answers" ADD CONSTRAINT "contest_problem_answers_contest_id_problem_id_contest_problems_contest_id_id_fk" FOREIGN KEY ("contest_id","problem_id") REFERENCES "public"."contest_problems"("contest_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_problems" ADD CONSTRAINT "contest_problems_contest_id_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_submissions" ADD CONSTRAINT "contest_submissions_contest_id_uid_contest_participants_contest_id_uid_fk" FOREIGN KEY ("contest_id","uid") REFERENCES "public"."contest_participants"("contest_id","uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenges_module_id_idx" ON "challenges" USING btree ("module_id");