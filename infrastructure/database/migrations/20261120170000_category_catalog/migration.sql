-- Master service catalog: subgroup heading, search keywords, stable catalog id.
ALTER TABLE "Category" ADD COLUMN "subgroup" TEXT;
ALTER TABLE "Category" ADD COLUMN "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Category" ADD COLUMN "catalogId" TEXT;
CREATE UNIQUE INDEX "Category_catalogId_key" ON "Category"("catalogId");
