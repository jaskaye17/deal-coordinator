-- CreateTable
CREATE TABLE "TemplateField" (
    "id" UUID NOT NULL,
    "templateVersionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pageIndex" INTEGER NOT NULL,
    "rect" JSONB NOT NULL,
    "defaultValue" TEXT,
    "signerRole" TEXT,
    "dataSourceKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateField_templateVersionId_idx" ON "TemplateField"("templateVersionId");

-- AddForeignKey
ALTER TABLE "TemplateField" ADD CONSTRAINT "TemplateField_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "TemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
