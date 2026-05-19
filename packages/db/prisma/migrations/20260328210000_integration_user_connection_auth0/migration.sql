-- AlterTable
ALTER TABLE "User" ADD COLUMN "auth0Sub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0Sub_key" ON "User"("auth0Sub");

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConnection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConfig_workspaceId_provider_key" ON "IntegrationConfig"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "IntegrationConfig_workspaceId_idx" ON "IntegrationConfig"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConnection_userId_provider_key" ON "UserConnection"("userId", "provider");

-- CreateIndex
CREATE INDEX "UserConnection_userId_idx" ON "UserConnection"("userId");

-- AddForeignKey
ALTER TABLE "IntegrationConfig" ADD CONSTRAINT "IntegrationConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
