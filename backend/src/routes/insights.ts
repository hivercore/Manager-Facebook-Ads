import { Router } from 'express';
import { getInsights, getAccountInsights } from '../controllers/insightsController';

export const insightsRouter = Router();

insightsRouter.get('/', getInsights);
insightsRouter.get('/account/:accountId', getAccountInsights);

