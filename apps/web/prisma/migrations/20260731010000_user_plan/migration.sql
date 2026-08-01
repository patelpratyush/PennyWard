-- Add a Plan tier to User, defaulting every existing and new row to 'free'.
-- No billing integration exists; this column is changed manually (DB/admin)
-- until a real upgrade flow is built. See lib/plan.ts for what each tier gates.

CREATE TYPE "Plan" AS ENUM ('free', 'pro', 'household');

ALTER TABLE "User" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'free';
