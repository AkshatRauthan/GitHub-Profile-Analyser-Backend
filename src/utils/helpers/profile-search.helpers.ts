import { CustomError } from '@errors';
import { StatusCodes } from 'http-status-codes';
import { PERSONA_DEFINITIONS, PERSONA_KEYS } from '@config';
import {
    IProfileSearchFilters,
    IProfileSearchQuery,
    ProfileSortField,
    SortOrder,
    PersonaKey,
} from '@types';

const SORT_FIELDS: ProfileSortField[] = [
    'githubUsername',
    'name',
    'publicRepos',
    'totalStars',
    'followers',
    'following',
    'lastAnalyzedAt',
    'createdAt',
    'accountCreatedAt',
    'bestPersonaScore',
    'personaScore',
];

const SORT_ORDERS: SortOrder[] = ['asc', 'desc'];

function parseString(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value).trim();
}

function parseNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    if (Number.isNaN(num)) {
        throw new CustomError(`Invalid numeric value "${value}"`, StatusCodes.BAD_REQUEST);
    }
    return num;
}

function parseBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const normalized = String(value).toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
    throw new CustomError(`Invalid boolean value "${value}"`, StatusCodes.BAD_REQUEST);
}

function parseDate(value: unknown, fieldName: string): Date | undefined {
    const str = parseString(value);
    if (!str) return undefined;

    const date = new Date(str);
    if (Number.isNaN(date.getTime())) {
        throw new CustomError(`Invalid date for "${fieldName}"`, StatusCodes.BAD_REQUEST);
    }
    return date;
}

function parseLanguages(value: unknown): string[] | undefined {
    const str = parseString(value);
    if (!str) return undefined;

    return str
        .split(',')
        .map((lang) => lang.trim())
        .filter(Boolean);
}

function parseSortBy(value: unknown): ProfileSortField | undefined {
    const str = parseString(value);
    if (!str) return undefined;

    if (!SORT_FIELDS.includes(str as ProfileSortField)) {
        throw new CustomError(
            `Invalid sortBy "${str}". Must be one of: ${SORT_FIELDS.join(', ')}`,
            StatusCodes.BAD_REQUEST
        );
    }

    return str as ProfileSortField;
}

function parseSortOrder(value: unknown): SortOrder | undefined {
    const str = parseString(value)?.toLowerCase();
    if (!str) return undefined;

    if (!SORT_ORDERS.includes(str as SortOrder)) {
        throw new CustomError(
            `Invalid sortOrder "${str}". Must be one of: ${SORT_ORDERS.join(', ')}`,
            StatusCodes.BAD_REQUEST
        );
    }

    return str as SortOrder;
}

function parseLanguagesMatch(value: unknown): 'any' | 'all' | undefined {
    const str = parseString(value)?.toLowerCase();
    if (!str) return undefined;

    if (str === 'any' || str === 'all') return str;
    throw new CustomError(
        `Invalid languagesMatch "${str}". Must be "any" or "all"`,
        StatusCodes.BAD_REQUEST
    );
}

function validateRanges(filters: IProfileSearchFilters): void {
    const rangeChecks: [number | undefined, number | undefined, string][] = [
        [filters.minStars, filters.maxStars, 'stars'],
        [filters.minRepos, filters.maxRepos, 'repos'],
        [filters.minFollowers, filters.maxFollowers, 'followers'],
        [filters.minFollowing, filters.maxFollowing, 'following'],
        [filters.minAccountAgeDays, filters.maxAccountAgeDays, 'account age (days)'],
    ];

    for (const [min, max, label] of rangeChecks) {
        if (min !== undefined && max !== undefined && min > max) {
            throw new CustomError(
                `min${label.charAt(0).toUpperCase()}${label.slice(1)} cannot exceed max value`,
                StatusCodes.BAD_REQUEST
            );
        }
    }

    if (
        filters.accountCreatedAfter &&
        filters.accountCreatedBefore &&
        filters.accountCreatedAfter > filters.accountCreatedBefore
    ) {
        throw new CustomError(
            'accountCreatedAfter cannot be after accountCreatedBefore',
            StatusCodes.BAD_REQUEST
        );
    }

    if (
        filters.lastAnalyzedAfter &&
        filters.lastAnalyzedBefore &&
        filters.lastAnalyzedAfter > filters.lastAnalyzedBefore
    ) {
        throw new CustomError(
            'lastAnalyzedAfter cannot be after lastAnalyzedBefore',
            StatusCodes.BAD_REQUEST
        );
    }

    if (filters.minLanguageRepos !== undefined && !filters.language) {
        throw new CustomError(
            'language is required when using minLanguageRepos',
            StatusCodes.BAD_REQUEST
        );
    }

    if (
        filters.minPersonaScore !== undefined &&
        filters.maxPersonaScore !== undefined &&
        filters.minPersonaScore > filters.maxPersonaScore
    ) {
        throw new CustomError(
            'minPersonaScore cannot exceed maxPersonaScore',
            StatusCodes.BAD_REQUEST
        );
    }

    if (filters.sortBy === 'personaScore' && !filters.persona) {
        throw new CustomError(
            'persona is required when sortBy=personaScore',
            StatusCodes.BAD_REQUEST
        );
    }

    if (
        (filters.minPersonaScore !== undefined ||
            filters.maxPersonaScore !== undefined ||
            filters.sortBy === 'personaScore') &&
        !filters.persona
    ) {
        throw new CustomError(
            'persona is required when filtering or sorting by persona score',
            StatusCodes.BAD_REQUEST
        );
    }
}

function parsePersona(value: unknown): PersonaKey | undefined {
    const str = parseString(value);
    if (!str) return undefined;

    if (!PERSONA_KEYS.includes(str as PersonaKey)) {
        throw new CustomError(
            `Invalid persona "${str}". Must be one of: ${PERSONA_KEYS.join(', ')}`,
            StatusCodes.BAD_REQUEST
        );
    }

    return str as PersonaKey;
}

function getPersonaName(persona: string): string {
    return PERSONA_DEFINITIONS[persona as PersonaKey]?.name ?? persona;
}

function parseSearchQuery(query: IProfileSearchQuery): IProfileSearchFilters {
    const filters: IProfileSearchFilters = {
        q: parseString(query.q),
        githubUsername: parseString(query.githubUsername),
        name: parseString(query.name),
        bio: parseString(query.bio),
        location: parseString(query.location),
        company: parseString(query.company),
        blog: parseString(query.blog),

        languages: parseLanguages(query.languages),
        languagesMatch: parseLanguagesMatch(query.languagesMatch) ?? 'any',
        primaryLanguage: parseString(query.primaryLanguage),
        minTopLanguages: parseNumber(query.minTopLanguages),
        language: parseString(query.language),
        minLanguageRepos: parseNumber(query.minLanguageRepos),

        minStars: parseNumber(query.minStars),
        maxStars: parseNumber(query.maxStars),
        minRepos: parseNumber(query.minRepos),
        maxRepos: parseNumber(query.maxRepos),
        minFollowers: parseNumber(query.minFollowers),
        maxFollowers: parseNumber(query.maxFollowers),
        minFollowing: parseNumber(query.minFollowing),
        maxFollowing: parseNumber(query.maxFollowing),

        accountCreatedAfter: parseDate(query.accountCreatedAfter, 'accountCreatedAfter'),
        accountCreatedBefore: parseDate(query.accountCreatedBefore, 'accountCreatedBefore'),
        lastAnalyzedAfter: parseDate(query.lastAnalyzedAfter, 'lastAnalyzedAfter'),
        lastAnalyzedBefore: parseDate(query.lastAnalyzedBefore, 'lastAnalyzedBefore'),
        minAccountAgeDays: parseNumber(query.minAccountAgeDays),
        maxAccountAgeDays: parseNumber(query.maxAccountAgeDays),

        hasBio: parseBoolean(query.hasBio),
        hasCompany: parseBoolean(query.hasCompany),
        hasLocation: parseBoolean(query.hasLocation),
        hasBlog: parseBoolean(query.hasBlog),
        hasTwitter: parseBoolean(query.hasTwitter),

        persona: parsePersona(query.persona),
        minPersonaScore: parseNumber(query.minPersonaScore),
        maxPersonaScore: parseNumber(query.maxPersonaScore),
        bestPersona: parsePersona(query.bestPersona),

        sortBy: parseSortBy(query.sortBy) ?? 'lastAnalyzedAt',
        sortOrder: parseSortOrder(query.sortOrder) ?? 'desc',
    };

    validateRanges(filters);
    return filters;
}

function buildLanguagePattern(language: string): string {
    return `"language":"${language}"`;
}

function buildPrimaryLanguagePattern(language: string): string {
    return `[{"language":"${language}"`;
}

function applyAccountAgeFilters(filters: IProfileSearchFilters): {
    accountCreatedAfter?: Date;
    accountCreatedBefore?: Date;
} {
    const now = new Date();
    let accountCreatedAfter = filters.accountCreatedAfter;
    let accountCreatedBefore = filters.accountCreatedBefore;

    if (filters.maxAccountAgeDays !== undefined) {
        const minDate = new Date(now);
        minDate.setUTCDate(minDate.getUTCDate() - filters.maxAccountAgeDays);
        accountCreatedAfter = accountCreatedAfter
            ? new Date(Math.max(accountCreatedAfter.getTime(), minDate.getTime()))
            : minDate;
    }

    if (filters.minAccountAgeDays !== undefined) {
        const maxDate = new Date(now);
        maxDate.setUTCDate(maxDate.getUTCDate() - filters.minAccountAgeDays);
        accountCreatedBefore = accountCreatedBefore
            ? new Date(Math.min(accountCreatedBefore.getTime(), maxDate.getTime()))
            : maxDate;
    }

    return { accountCreatedAfter, accountCreatedBefore };
}

function buildPrismaWhere(userId: string, filters: IProfileSearchFilters): Record<string, unknown> {
    const where: Record<string, unknown> = { userId };
    const andConditions: Record<string, unknown>[] = [];

    if (filters.q) {
        andConditions.push({
            OR: [
                { githubUsername: { contains: filters.q } },
                { name: { contains: filters.q } },
                { bio: { contains: filters.q } },
                { company: { contains: filters.q } },
                { location: { contains: filters.q } },
                { blog: { contains: filters.q } },
            ],
        });
    }

    if (filters.githubUsername) {
        where.githubUsername = { contains: filters.githubUsername };
    }

    if (filters.name) where.name = { contains: filters.name };
    if (filters.bio) where.bio = { contains: filters.bio };
    if (filters.location) where.location = { contains: filters.location };
    if (filters.company) where.company = { contains: filters.company };
    if (filters.blog) where.blog = { contains: filters.blog };

    if (filters.languages?.length) {
        const languageConditions = filters.languages.map((lang) => ({
            topLanguages: { contains: buildLanguagePattern(lang) },
        }));

        andConditions.push(
            filters.languagesMatch === 'all'
                ? { AND: languageConditions }
                : { OR: languageConditions }
        );
    }

    if (filters.primaryLanguage) {
        where.topLanguages = { contains: buildPrimaryLanguagePattern(filters.primaryLanguage) };
    }

    if (filters.minStars !== undefined || filters.maxStars !== undefined) {
        where.totalStars = {
            ...(filters.minStars !== undefined && { gte: filters.minStars }),
            ...(filters.maxStars !== undefined && { lte: filters.maxStars }),
        };
    }

    if (filters.minRepos !== undefined || filters.maxRepos !== undefined) {
        where.publicRepos = {
            ...(filters.minRepos !== undefined && { gte: filters.minRepos }),
            ...(filters.maxRepos !== undefined && { lte: filters.maxRepos }),
        };
    }

    if (filters.minFollowers !== undefined || filters.maxFollowers !== undefined) {
        where.followers = {
            ...(filters.minFollowers !== undefined && { gte: filters.minFollowers }),
            ...(filters.maxFollowers !== undefined && { lte: filters.maxFollowers }),
        };
    }

    if (filters.minFollowing !== undefined || filters.maxFollowing !== undefined) {
        where.following = {
            ...(filters.minFollowing !== undefined && { gte: filters.minFollowing }),
            ...(filters.maxFollowing !== undefined && { lte: filters.maxFollowing }),
        };
    }

    const { accountCreatedAfter, accountCreatedBefore } = applyAccountAgeFilters(filters);

    if (accountCreatedAfter || accountCreatedBefore) {
        where.accountCreatedAt = {
            ...(accountCreatedAfter && { gte: accountCreatedAfter }),
            ...(accountCreatedBefore && { lte: accountCreatedBefore }),
        };
    }

    if (filters.lastAnalyzedAfter || filters.lastAnalyzedBefore) {
        where.lastAnalyzedAt = {
            ...(filters.lastAnalyzedAfter && { gte: filters.lastAnalyzedAfter }),
            ...(filters.lastAnalyzedBefore && { lte: filters.lastAnalyzedBefore }),
        };
    }

    if (filters.hasBio === true) {
        andConditions.push({ bio: { not: null } }, { NOT: { bio: '' } });
    } else if (filters.hasBio === false) {
        andConditions.push({ OR: [{ bio: null }, { bio: '' }] });
    }

    if (filters.hasCompany === true) {
        andConditions.push({ company: { not: null } }, { NOT: { company: '' } });
    } else if (filters.hasCompany === false) {
        andConditions.push({ OR: [{ company: null }, { company: '' }] });
    }

    if (filters.hasLocation === true) {
        andConditions.push({ location: { not: null } }, { NOT: { location: '' } });
    } else if (filters.hasLocation === false) {
        andConditions.push({ OR: [{ location: null }, { location: '' }] });
    }

    if (filters.hasBlog === true) {
        andConditions.push({ blog: { not: null } }, { NOT: { blog: '' } });
    } else if (filters.hasBlog === false) {
        andConditions.push({ OR: [{ blog: null }, { blog: '' }] });
    }

    if (filters.hasTwitter === true) {
        andConditions.push({ twitterUsername: { not: null } }, { NOT: { twitterUsername: '' } });
    } else if (filters.hasTwitter === false) {
        andConditions.push({ OR: [{ twitterUsername: null }, { twitterUsername: '' }] });
    }

    if (andConditions.length) {
        where.AND = andConditions;
    }

    return where;
}

function getAppliedFilters(filters: IProfileSearchFilters): Partial<IProfileSearchFilters> {
    return Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
    );
}

export default {
    parseSearchQuery,
    buildPrismaWhere,
    getAppliedFilters,
    getPersonaName,
    buildLanguagePattern,
};
