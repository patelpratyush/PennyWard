-- AlterTable
ALTER TABLE "Goal" ADD COLUMN "scenarioId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Goal_scenarioId_key" ON "Goal"("scenarioId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "PayoffScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
