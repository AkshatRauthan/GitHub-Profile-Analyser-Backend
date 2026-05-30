-- AlterTable
ALTER TABLE `github_profiles` ADD COLUMN `bestPersona` VARCHAR(191) NULL,
    ADD COLUMN `bestPersonaScore` DOUBLE NULL,
    ADD COLUMN `lastRankedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `profile_rankings` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `persona` VARCHAR(191) NOT NULL,
    `overallScore` DOUBLE NOT NULL,
    `grade` VARCHAR(191) NOT NULL,
    `breakdown` TEXT NOT NULL,
    `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `profile_rankings_persona_overallScore_idx`(`persona`, `overallScore`),
    UNIQUE INDEX `profile_rankings_profileId_persona_key`(`profileId`, `persona`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profile_rankings` ADD CONSTRAINT `profile_rankings_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `github_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
