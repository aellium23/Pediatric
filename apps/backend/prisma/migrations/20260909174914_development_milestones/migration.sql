-- CreateTable
CREATE TABLE "DevelopmentMilestone" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevelopmentMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DevelopmentMilestone_childId_idx" ON "DevelopmentMilestone"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "DevelopmentMilestone_childId_code_key" ON "DevelopmentMilestone"("childId", "code");
