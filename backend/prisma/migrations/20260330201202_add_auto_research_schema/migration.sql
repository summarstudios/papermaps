-- CreateTable
CREATE TABLE "auto_research_signals" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "placeName" TEXT NOT NULL,
    "placeLocation" JSONB,
    "citySlug" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "candidateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_research_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_research_candidates" (
    "id" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "placeLocation" JSONB NOT NULL,
    "citySlug" TEXT NOT NULL,
    "resolvedGoogleId" TEXT,
    "corroborationCount" INTEGER NOT NULL DEFAULT 1,
    "sources" TEXT[],
    "aggregatedEvidence" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_research_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_research_proposals" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT,
    "proposalType" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "existingPoiId" TEXT,
    "llmScore" DOUBLE PRECISION NOT NULL,
    "llmDimensions" JSONB NOT NULL,
    "llmReasoning" TEXT NOT NULL,
    "llmConcerns" TEXT,
    "llmModel" TEXT NOT NULL,
    "llmPromptVersion" TEXT NOT NULL,
    "suggestedName" TEXT,
    "suggestedCategory" TEXT,
    "suggestedDesc" TEXT,
    "evidenceSummary" TEXT NOT NULL,
    "sourceUrls" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "resultingPoiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_research_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_research_audit_trail" (
    "id" TEXT NOT NULL,
    "poiId" TEXT,
    "eventType" TEXT NOT NULL,
    "proposalId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_research_audit_trail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_research_feedback_signals" (
    "id" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_research_feedback_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_readiness_scores" (
    "id" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "totalCandidates" INTEGER NOT NULL DEFAULT 0,
    "qualityCandidates" INTEGER NOT NULL DEFAULT 0,
    "sourceDiversity" INTEGER NOT NULL DEFAULT 0,
    "geographicSpread" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "readinessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_readiness_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auto_research_signals_citySlug_idx" ON "auto_research_signals"("citySlug");

-- CreateIndex
CREATE INDEX "auto_research_signals_source_idx" ON "auto_research_signals"("source");

-- CreateIndex
CREATE INDEX "auto_research_signals_status_idx" ON "auto_research_signals"("status");

-- CreateIndex
CREATE INDEX "auto_research_signals_scrapedAt_idx" ON "auto_research_signals"("scrapedAt");

-- CreateIndex
CREATE INDEX "auto_research_signals_placeName_idx" ON "auto_research_signals"("placeName");

-- CreateIndex
CREATE INDEX "auto_research_candidates_citySlug_idx" ON "auto_research_candidates"("citySlug");

-- CreateIndex
CREATE INDEX "auto_research_candidates_status_idx" ON "auto_research_candidates"("status");

-- CreateIndex
CREATE INDEX "auto_research_candidates_resolvedGoogleId_idx" ON "auto_research_candidates"("resolvedGoogleId");

-- CreateIndex
CREATE INDEX "auto_research_candidates_corroborationCount_idx" ON "auto_research_candidates"("corroborationCount");

-- CreateIndex
CREATE INDEX "auto_research_proposals_citySlug_idx" ON "auto_research_proposals"("citySlug");

-- CreateIndex
CREATE INDEX "auto_research_proposals_status_idx" ON "auto_research_proposals"("status");

-- CreateIndex
CREATE INDEX "auto_research_proposals_proposalType_idx" ON "auto_research_proposals"("proposalType");

-- CreateIndex
CREATE INDEX "auto_research_proposals_llmScore_idx" ON "auto_research_proposals"("llmScore");

-- CreateIndex
CREATE INDEX "auto_research_proposals_candidateId_idx" ON "auto_research_proposals"("candidateId");

-- CreateIndex
CREATE INDEX "auto_research_proposals_reviewedById_idx" ON "auto_research_proposals"("reviewedById");

-- CreateIndex
CREATE INDEX "auto_research_proposals_createdAt_idx" ON "auto_research_proposals"("createdAt");

-- CreateIndex
CREATE INDEX "auto_research_audit_trail_poiId_idx" ON "auto_research_audit_trail"("poiId");

-- CreateIndex
CREATE INDEX "auto_research_audit_trail_eventType_idx" ON "auto_research_audit_trail"("eventType");

-- CreateIndex
CREATE INDEX "auto_research_audit_trail_proposalId_idx" ON "auto_research_audit_trail"("proposalId");

-- CreateIndex
CREATE INDEX "auto_research_audit_trail_actorId_idx" ON "auto_research_audit_trail"("actorId");

-- CreateIndex
CREATE INDEX "auto_research_audit_trail_createdAt_idx" ON "auto_research_audit_trail"("createdAt");

-- CreateIndex
CREATE INDEX "auto_research_feedback_signals_poiId_idx" ON "auto_research_feedback_signals"("poiId");

-- CreateIndex
CREATE INDEX "auto_research_feedback_signals_citySlug_idx" ON "auto_research_feedback_signals"("citySlug");

-- CreateIndex
CREATE INDEX "auto_research_feedback_signals_eventType_idx" ON "auto_research_feedback_signals"("eventType");

-- CreateIndex
CREATE INDEX "auto_research_feedback_signals_createdAt_idx" ON "auto_research_feedback_signals"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "city_readiness_scores_citySlug_key" ON "city_readiness_scores"("citySlug");

-- AddForeignKey
ALTER TABLE "auto_research_signals" ADD CONSTRAINT "auto_research_signals_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "auto_research_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_research_proposals" ADD CONSTRAINT "auto_research_proposals_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "auto_research_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_research_proposals" ADD CONSTRAINT "auto_research_proposals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
