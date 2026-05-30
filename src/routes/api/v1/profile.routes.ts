import express, { Router } from 'express';
import { profileController } from '@controllers';
import { rankingController } from '@controllers';
import { authMiddlewares } from '@middlewares';

const router: Router = express.Router();

router.use(authMiddlewares.authenticateUser);

router.get(
    '/personas',
    rankingController.getPersonas
);

router.get(
    '/rankings/leaderboard',
    rankingController.getLeaderboard
);

router.post(
    '/rank/:username',
    rankingController.rankProfile
);

router.post(
    '/analyze/:username',
    profileController.analyzeProfile
);

router.get(
    '/requests',
    profileController.getAnalysisRequests
);

router.get(
    '/search',
    profileController.searchProfiles
);

router.get(
    '/:username/rankings',
    rankingController.getProfileRankings
);

router.get(
    '/:username/composition',
    profileController.getRepoComposition
);

router.get(
    '/:username/heatmap',
    profileController.getContributionHeatmap
);

router.get(
    '/',
    profileController.getAllProfiles
);

router.get(
    '/:username',
    profileController.getProfile
);

export default router;
