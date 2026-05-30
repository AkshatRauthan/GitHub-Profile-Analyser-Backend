import { prisma } from '@config';
import { PERSONA_DEFINITIONS } from '@config';
import {
    IPersonaRanking,
    IProfileRankingRecord,
    PersonaKey,
    PersonaGrade,
    ILeaderboardResult,
    IMetricBreakdown,
    IGitHubProfile,
} from '@types';

function parseBreakdown(rawBreakdown: string): IMetricBreakdown[] {
    return JSON.parse(rawBreakdown);
}

function parseRanking(rawRanking: any): IProfileRankingRecord {
    return {
        id: rawRanking.id,
        profileId: rawRanking.profileId,
        persona: rawRanking.persona as PersonaKey,
        personaName: PERSONA_DEFINITIONS[rawRanking.persona as PersonaKey].name,
        overallScore: rawRanking.overallScore,
        grade: rawRanking.grade as PersonaGrade,
        breakdown: parseBreakdown(rawRanking.breakdown),
        computedAt: rawRanking.computedAt,
    };
}

function toPersonaRanking(record: IProfileRankingRecord): IPersonaRanking {
    return {
        persona: record.persona,
        personaName: record.personaName,
        overallScore: record.overallScore,
        grade: record.grade,
        breakdown: record.breakdown,
        computedAt: record.computedAt,
    };
}

function parseProfile(rawProfile: any): IGitHubProfile {
    return {
        ...rawProfile,
        topLanguages: rawProfile.topLanguages
            ? JSON.parse(rawProfile.topLanguages)
            : [],
    };
}

async function upsertRankings(
    profileId: string,
    rankings: IPersonaRanking[]
): Promise<void> {
    const now = new Date();

    await Promise.all(
        rankings.map((ranking) =>
            prisma.profile_ranking.upsert({
                where: {
                    profileId_persona: {
                        profileId,
                        persona: ranking.persona,
                    },
                },
                create: {
                    profileId,
                    persona: ranking.persona,
                    overallScore: ranking.overallScore,
                    grade: ranking.grade,
                    breakdown: JSON.stringify(ranking.breakdown),
                    computedAt: now,
                },
                update: {
                    overallScore: ranking.overallScore,
                    grade: ranking.grade,
                    breakdown: JSON.stringify(ranking.breakdown),
                    computedAt: now,
                },
            })
        )
    );
}

async function findByProfileId(profileId: string): Promise<IPersonaRanking[]> {
    const rankings = await prisma.profile_ranking.findMany({
        where: { profileId },
        orderBy: { overallScore: 'desc' },
    });

    return rankings.map(parseRanking).map(toPersonaRanking);
}

async function getLeaderboard(
    userId: string,
    persona: PersonaKey,
    page: number,
    limit: number,
    minScore?: number
): Promise<ILeaderboardResult> {
    const skip = (page - 1) * limit;
    const where = {
        persona,
        profile: { userId },
        ...(minScore !== undefined && { overallScore: { gte: minScore } }),
    };

    const [rankings, total] = await Promise.all([
        prisma.profile_ranking.findMany({
            where,
            include: { profile: true },
            orderBy: { overallScore: 'desc' },
            skip,
            take: limit,
        }),
        prisma.profile_ranking.count({ where }),
    ]);

    return {
        persona,
        personaName: PERSONA_DEFINITIONS[persona].name,
        items: rankings.map((ranking: any, index: number) => ({
            rank: skip + index + 1,
            profile: parseProfile(ranking.profile),
            persona,
            personaName: PERSONA_DEFINITIONS[persona].name,
            overallScore: ranking.overallScore,
            grade: ranking.grade as PersonaGrade,
            computedAt: ranking.computedAt,
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 0,
        },
    };
}

export default {
    upsertRankings,
    findByProfileId,
    getLeaderboard,
};
