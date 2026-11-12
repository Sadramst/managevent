-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "revokedTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Pass" ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WellEntry" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_providerEventId_key" ON "WebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "Invitation_isDemo_publishedAt_idx" ON "Invitation"("isDemo", "publishedAt");

-- CreateIndex
CREATE INDEX "Party_invitationId_deletedAt_idx" ON "Party"("invitationId", "deletedAt");

-- CreateIndex
CREATE INDEX "Guest_partyId_idx" ON "Guest"("partyId");

-- CreateIndex
CREATE INDEX "EventHeadcount_eventId_takenAt_idx" ON "EventHeadcount"("eventId", "takenAt");

-- CreateIndex
CREATE INDEX "Pass_partyId_idx" ON "Pass"("partyId");

-- CreateIndex
CREATE INDEX "Pass_guestId_idx" ON "Pass"("guestId");

-- CreateIndex
CREATE INDEX "ScanEvent_eventId_scannedAt_idx" ON "ScanEvent"("eventId", "scannedAt");

-- CreateIndex
CREATE INDEX "ScanEvent_passId_idx" ON "ScanEvent"("passId");

-- CreateIndex
CREATE UNIQUE INDEX "WellEntry_idempotencyKey_key" ON "WellEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WellEntry_invitationId_moderation_createdAt_idx" ON "WellEntry"("invitationId", "moderation", "createdAt");

-- CreateIndex
CREATE INDEX "Message_eventId_templateKey_to_idx" ON "Message"("eventId", "templateKey", "to");

-- CreateIndex
CREATE INDEX "Message_campaignId_idx" ON "Message"("campaignId");

-- CreateIndex
CREATE INDEX "Message_providerId_idx" ON "Message"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_idempotencyKey_key" ON "Campaign"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Campaign_invitationId_createdAt_idx" ON "Campaign"("invitationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_subjectType_subjectId_purpose_idx" ON "ConsentRecord"("subjectType", "subjectId", "purpose");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

