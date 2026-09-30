ALTER TABLE "submissions" ALTER COLUMN "code_snapshot" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "code_snapshot" DROP NOT NULL;