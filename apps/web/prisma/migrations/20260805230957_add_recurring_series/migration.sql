-- CreateEnum
CREATE TYPE "RecurringCadence" AS ENUM ('weekly', 'biweekly', 'monthly', 'annual');

-- CreateTable
CREATE TABLE "RecurringSeries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payeeNorm" TEXT NOT NULL,
    "cadence" "RecurringCadence" NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringSeries_userId_idx" ON "RecurringSeries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringSeries_userId_payeeNorm_key" ON "RecurringSeries"("userId", "payeeNorm");

-- AddForeignKey
ALTER TABLE "RecurringSeries" ADD CONSTRAINT "RecurringSeries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
