-- CreateTable
CREATE TABLE `github_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `githubUsername` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `location` VARCHAR(191) NULL,
    `company` VARCHAR(191) NULL,
    `blog` VARCHAR(191) NULL,
    `twitterUsername` VARCHAR(191) NULL,
    `publicRepos` INTEGER NOT NULL DEFAULT 0,
    `followers` INTEGER NOT NULL DEFAULT 0,
    `following` INTEGER NOT NULL DEFAULT 0,
    `totalStars` INTEGER NOT NULL DEFAULT 0,
    `topLanguages` VARCHAR(191) NULL,
    `accountCreatedAt` DATETIME(3) NULL,
    `lastAnalyzedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `github_profiles_userId_githubUsername_key`(`userId`, `githubUsername`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `github_analysis_requests` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `githubUsername` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `errorMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `github_profiles` ADD CONSTRAINT `github_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `github_analysis_requests` ADD CONSTRAINT `github_analysis_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `github_analysis_requests` ADD CONSTRAINT `github_analysis_requests_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `github_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
