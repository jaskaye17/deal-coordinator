-- CreateTable
CREATE TABLE "ResponsibleBroker" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponsibleBroker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResponsibleBroker_workspaceId_idx" ON "ResponsibleBroker"("workspaceId");

-- AddForeignKey
ALTER TABLE "ResponsibleBroker" ADD CONSTRAINT "ResponsibleBroker_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
