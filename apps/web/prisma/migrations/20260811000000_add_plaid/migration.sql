-- CreateEnum
CREATE TYPE "PlaidItemStatus" AS ENUM ('active', 'login_required', 'error');

-- CreateTable
CREATE TABLE "PlaidItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "institutionName" TEXT,
    "cursor" TEXT,
    "status" "PlaidItemStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_plaidItemId_key" ON "PlaidItem"("plaidItemId");

-- CreateIndex
CREATE INDEX "PlaidItem_userId_idx" ON "PlaidItem"("userId");

-- AddForeignKey
ALTER TABLE "PlaidItem" ADD CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable FinancialAccount
ALTER TABLE "FinancialAccount" ADD COLUMN "plaidItemDbId" TEXT;
ALTER TABLE "FinancialAccount" ADD COLUMN "plaidAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_plaidAccountId_key" ON "FinancialAccount"("plaidAccountId");

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_plaidItemDbId_fkey" FOREIGN KEY ("plaidItemDbId") REFERENCES "PlaidItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Transaction
ALTER TABLE "Transaction" ADD COLUMN "plaidTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_plaidTransactionId_key" ON "Transaction"("plaidTransactionId");
