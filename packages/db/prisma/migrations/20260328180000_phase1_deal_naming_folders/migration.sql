-- AlterTable
ALTER TABLE "Deal" ADD COLUMN "displayName" TEXT,
ADD COLUMN "slug" TEXT,
ADD COLUMN "propertyAddress" TEXT,
ADD COLUMN "primaryContactName" TEXT;

UPDATE "Deal" SET
  "displayName" = COALESCE(NULLIF(TRIM("title"), ''), 'Untitled deal'),
  "propertyAddress" = "address",
  "primaryContactName" = COALESCE(NULLIF(TRIM("title"), ''), 'Unknown contact'),
  "slug" = 'legacy-' || REPLACE("id"::text, '-', '')
WHERE "slug" IS NULL;

CREATE UNIQUE INDEX "Deal_workspaceId_slug_key" ON "Deal"("workspaceId", "slug");

-- CreateTable
CREATE TABLE "FolderTemplate" (
    "id" UUID NOT NULL,
    "workflowKey" TEXT NOT NULL,
    "structureJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolderTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FolderTemplate_workflowKey_key" ON "FolderTemplate"("workflowKey");

-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN "assetType" TEXT;
