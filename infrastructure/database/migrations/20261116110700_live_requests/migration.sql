-- CreateEnum
CREATE TYPE "LiveRequestStatus" AS ENUM ('OPEN', 'CONNECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LiveResponseStatus" AS ENUM ('INTERESTED', 'WITHDRAWN');

-- AlterEnum
ALTER TYPE "ContactKind" ADD VALUE 'LIVE_REQUEST_CONNECTED';

-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'LIVE_REQUESTS';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "supportsLiveRequest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "acceptsLiveRequests" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quietHoursEnd" INTEGER,
ADD COLUMN     "quietHoursStart" INTEGER;

-- CreateTable
CREATE TABLE "LiveRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "status" "LiveRequestStatus" NOT NULL DEFAULT 'OPEN',
    "scheduledFor" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rebroadcastedAt" TIMESTAMP(3),
    "connectedProviderId" TEXT,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveRequestResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "LiveResponseStatus" NOT NULL DEFAULT 'INTERESTED',
    "etaMinutes" INTEGER,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveRequestResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveRequest_status_categoryId_expiresAt_idx" ON "LiveRequest"("status", "categoryId", "expiresAt");

-- CreateIndex
CREATE INDEX "LiveRequest_customerId_status_idx" ON "LiveRequest"("customerId", "status");

-- CreateIndex
CREATE INDEX "LiveRequestResponse_providerId_status_idx" ON "LiveRequestResponse"("providerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LiveRequestResponse_requestId_providerId_key" ON "LiveRequestResponse"("requestId", "providerId");

-- AddForeignKey
ALTER TABLE "LiveRequest" ADD CONSTRAINT "LiveRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveRequest" ADD CONSTRAINT "LiveRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveRequestResponse" ADD CONSTRAINT "LiveRequestResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LiveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveRequestResponse" ADD CONSTRAINT "LiveRequestResponse_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
