-- AlterTable
ALTER TABLE "School" ADD COLUMN     "enabledModules" JSONB NOT NULL DEFAULT '[]';
