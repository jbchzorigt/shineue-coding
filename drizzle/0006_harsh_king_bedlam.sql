ALTER TABLE "contest_participants" ADD COLUMN "status" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "contest_participants" ADD COLUMN "decided_by" text;--> statement-breakpoint
ALTER TABLE "contest_participants" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contests" ADD COLUMN "requires_approval" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_decided_by_users_uid_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contest_participants_status_idx" ON "contest_participants" USING btree ("contest_id","status");--> statement-breakpoint
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_status_check" CHECK ("contest_participants"."status" in ('pending', 'approved', 'rejected'));