-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN "attendeesJson" JSONB,
ADD COLUMN "eventType" TEXT,
ADD COLUMN "externalId" TEXT,
ADD COLUMN "externalProvider" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "FolderTemplate" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN "buyerEntityName" TEXT,
ADD COLUMN "closeDate" TIMESTAMP(3),
ADD COLUMN "earnestMoney" DECIMAL(19,4),
ADD COLUMN "extractedFieldsJson" JSONB,
ADD COLUMN "extractionConfidenceJson" JSONB,
ADD COLUMN "financingType" TEXT,
ADD COLUMN "offerLabel" TEXT,
ADD COLUMN "optionPeriodDays" INTEGER,
ADD COLUMN "preapprovalStatus" TEXT,
ADD COLUMN "proofOfFundsStatus" TEXT,
ADD COLUMN "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "summaryJson" JSONB;

-- AlterTable
ALTER TABLE "OfferFile" ADD COLUMN "fileName" TEXT;
UPDATE "OfferFile" SET "fileName" = "name";
ALTER TABLE "OfferFile" DROP COLUMN "name";
ALTER TABLE "OfferFile" ALTER COLUMN "fileName" SET NOT NULL;

ALTER TABLE "OfferFile" ADD COLUMN "fileType" TEXT;
ALTER TABLE "OfferFile" ADD COLUMN "versionLabel" TEXT;
ALTER TABLE "OfferFile" ADD COLUMN "workspaceId" UUID;

UPDATE "OfferFile" SET "workspaceId" = (SELECT "workspaceId" FROM "Offer" WHERE "Offer"."id" = "OfferFile"."offerId") WHERE "workspaceId" IS NULL;
ALTER TABLE "OfferFile" ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "TemplateField" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "OfferComparisonSnapshot" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "dealId" UUID NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferComparisonSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfferComparisonSnapshot_dealId_idx" ON "OfferComparisonSnapshot"("dealId");

-- CreateIndex
CREATE INDEX "OfferComparisonSnapshot_workspaceId_idx" ON "OfferComparisonSnapshot"("workspaceId");

-- CreateIndex
CREATE INDEX "CalendarEvent_eventType_idx" ON "CalendarEvent"("eventType");

-- CreateIndex
CREATE INDEX "OfferFile_offerId_idx" ON "OfferFile"("offerId");

-- CreateIndex
CREATE INDEX "OfferFile_workspaceId_idx" ON "OfferFile"("workspaceId");

-- AddForeignKey
ALTER TABLE "OfferFile" ADD CONSTRAINT "OfferFile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferComparisonSnapshot" ADD CONSTRAINT "OfferComparisonSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferComparisonSnapshot" ADD CONSTRAINT "OfferComparisonSnapshot_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
