-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'GIG');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'PAUSED', 'CLOSED');

-- AlterEnum
ALTER TYPE "ContactKind" ADD VALUE 'JOB_CONTACT_REVEALED';

-- DropIndex
DROP INDEX "ProviderProfile_displayName_trgm";

-- DropIndex
DROP INDEX "ProviderProfile_headline_trgm";

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "jobType" "JobType" NOT NULL DEFAULT 'FULL_TIME',
    "categoryId" TEXT,
    "payMinPaise" INTEGER,
    "payMaxPaise" INTEGER,
    "payUnit" TEXT,
    "city" TEXT,
    "locality" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobPosting_status_categoryId_createdAt_idx" ON "JobPosting"("status", "categoryId", "createdAt");

-- CreateIndex
CREATE INDEX "JobPosting_providerId_status_idx" ON "JobPosting"("providerId", "status");

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
