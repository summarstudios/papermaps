-- AlterTable
ALTER TABLE "cities" ADD COLUMN     "curatorId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "baseCity" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "curatorSince" TIMESTAMP(3),
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "isPublicCurator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "socialLinks" JSONB;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
