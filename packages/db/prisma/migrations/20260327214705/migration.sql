/*
  Warnings:

  - You are about to drop the column `createdBy` on the `DocumentVersion` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `DocumentVersion` table. All the data in the column will be lost.
  - You are about to drop the column `assignedTo` on the `ReviewTask` table. All the data in the column will be lost.
  - You are about to drop the column `decidedAt` on the `ReviewTask` table. All the data in the column will be lost.
  - You are about to drop the column `decidedBy` on the `ReviewTask` table. All the data in the column will be lost.
  - You are about to drop the column `decision` on the `ReviewTask` table. All the data in the column will be lost.
  - You are about to drop the column `decisionNote` on the `ReviewTask` table. All the data in the column will be lost.
  - You are about to drop the column `payload` on the `ReviewTask` table. All the data in the column will be lost.
  - Added the required column `documentType` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateType` to the `DocumentTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workflowType` to the `DocumentTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `DocumentVersion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actionType` to the `ReviewTask` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "currentVersionNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "documentType" TEXT NOT NULL,
ADD COLUMN     "latestFileUrl" TEXT,
ADD COLUMN     "requiresReview" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DocumentTemplate" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rulesJson" JSONB,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "templateType" TEXT NOT NULL,
ADD COLUMN     "workflowType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DocumentVersion" DROP COLUMN "createdBy",
DROP COLUMN "version",
ADD COLUMN     "changeSummary" TEXT,
ADD COLUMN     "createdByActorId" TEXT,
ADD COLUMN     "createdByActorType" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN     "generatedFromFieldsJson" JSONB,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "workspaceId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "ReviewTask" DROP COLUMN "assignedTo",
DROP COLUMN "decidedAt",
DROP COLUMN "decidedBy",
DROP COLUMN "decision",
DROP COLUMN "decisionNote",
DROP COLUMN "payload",
ADD COLUMN     "actionType" TEXT NOT NULL,
ADD COLUMN     "assignedToUserId" UUID,
ADD COLUMN     "payloadJson" JSONB,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedByUserId" UUID;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "category" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceType" TEXT;

-- CreateTable
CREATE TABLE "SignatureEnvelope" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "dealId" UUID NOT NULL,
    "reviewTaskId" UUID,
    "provider" TEXT NOT NULL DEFAULT 'fake',
    "providerEnvelopeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "recipientsJson" JSONB,
    "documentIdsJson" JSONB,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignatureEnvelope_workspaceId_idx" ON "SignatureEnvelope"("workspaceId");

-- CreateIndex
CREATE INDEX "SignatureEnvelope_dealId_idx" ON "SignatureEnvelope"("dealId");

-- CreateIndex
CREATE INDEX "SignatureEnvelope_status_idx" ON "SignatureEnvelope"("status");

-- CreateIndex
CREATE INDEX "SignatureEnvelope_reviewTaskId_idx" ON "SignatureEnvelope"("reviewTaskId");

-- CreateIndex
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");

-- CreateIndex
CREATE INDEX "DocumentTemplate_workspaceId_idx" ON "DocumentTemplate"("workspaceId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_workflowType_idx" ON "DocumentTemplate"("workflowType");

-- CreateIndex
CREATE INDEX "DocumentTemplate_templateType_idx" ON "DocumentTemplate"("templateType");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE INDEX "DocumentVersion_workspaceId_idx" ON "DocumentVersion"("workspaceId");

-- CreateIndex
CREATE INDEX "DocumentVersion_versionNumber_idx" ON "DocumentVersion"("versionNumber");

-- CreateIndex
CREATE INDEX "ReviewTask_actionType_idx" ON "ReviewTask"("actionType");

-- CreateIndex
CREATE INDEX "ReviewTask_assignedToUserId_idx" ON "ReviewTask"("assignedToUserId");

-- CreateIndex
CREATE INDEX "Task_category_idx" ON "Task"("category");

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureEnvelope" ADD CONSTRAINT "SignatureEnvelope_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureEnvelope" ADD CONSTRAINT "SignatureEnvelope_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureEnvelope" ADD CONSTRAINT "SignatureEnvelope_reviewTaskId_fkey" FOREIGN KEY ("reviewTaskId") REFERENCES "ReviewTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
