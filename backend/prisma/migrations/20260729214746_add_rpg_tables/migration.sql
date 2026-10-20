/*
  Warnings:

  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SkillRequirement_sourceId_targetId_key";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Skill" ALTER COLUMN "iconName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserSkill" ALTER COLUMN "status" SET DEFAULT 'LOCKED';
