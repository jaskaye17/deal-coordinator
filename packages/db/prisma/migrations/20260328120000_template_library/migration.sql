-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" UUID NOT NULL,
    "workspaceId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "parentTemplateId" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "documentType" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "jurisdiction" TEXT,
    "notes" TEXT,
    "isRequiredByDefault" BOOLEAN NOT NULL DEFAULT false,
    "fieldMappingJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateVersion" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileHash" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'pdf',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateWorkflow" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "workflowKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Template_slug_key" ON "Template"("slug");

-- CreateIndex
CREATE INDEX "Template_workspaceId_idx" ON "Template"("workspaceId");

-- CreateIndex
CREATE INDEX "Template_isSystemTemplate_idx" ON "Template"("isSystemTemplate");

-- CreateIndex
CREATE INDEX "Template_documentType_idx" ON "Template"("documentType");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateVersion_templateId_versionNumber_key" ON "TemplateVersion"("templateId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateVersion_templateId_fileHash_key" ON "TemplateVersion"("templateId", "fileHash");

-- CreateIndex
CREATE INDEX "TemplateVersion_templateId_idx" ON "TemplateVersion"("templateId");

-- CreateIndex
CREATE INDEX "TemplateVersion_fileHash_idx" ON "TemplateVersion"("fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateWorkflow_templateId_workflowKey_key" ON "TemplateWorkflow"("templateId", "workflowKey");

-- CreateIndex
CREATE INDEX "TemplateWorkflow_workflowKey_idx" ON "TemplateWorkflow"("workflowKey");

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_parentTemplateId_fkey" FOREIGN KEY ("parentTemplateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateWorkflow" ADD CONSTRAINT "TemplateWorkflow_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateWorkflow" ADD CONSTRAINT "TemplateWorkflow_workflowKey_fkey" FOREIGN KEY ("workflowKey") REFERENCES "WorkflowDefinition"("key") ON DELETE CASCADE ON UPDATE CASCADE;
