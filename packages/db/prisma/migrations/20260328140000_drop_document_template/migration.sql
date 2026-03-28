-- Drop legacy DocumentTemplate; Document.templateId now references Template.

ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_templateId_fkey";

UPDATE "Document" SET "templateId" = NULL WHERE "templateId" IS NOT NULL;

DROP TABLE IF EXISTS "DocumentTemplate";

ALTER TABLE "Document" ADD CONSTRAINT "Document_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
