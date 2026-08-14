-- AlterTable
ALTER TABLE "User" ADD COLUMN "onboardingSteps" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN "onboardingDismissed" BOOLEAN NOT NULL DEFAULT false;
