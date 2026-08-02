-- CreateEnum
CREATE TYPE "LoanScenarioKind" AS ENUM ('car', 'general');

-- CreateTable
CREATE TABLE "LoanScenario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "kind" "LoanScenarioKind" NOT NULL,
    "vehiclePrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "downPayment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tradeInValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tradeInOwed" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rebate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "docFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "registrationFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "destinationFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dealerFees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loanAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "apr" DECIMAL(6,4) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "extraMonthly" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "oneTimePayment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoanScenario_userId_idx" ON "LoanScenario"("userId");

-- AddForeignKey
ALTER TABLE "LoanScenario" ADD CONSTRAINT "LoanScenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
