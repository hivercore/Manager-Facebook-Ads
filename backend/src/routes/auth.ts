import { Router } from 'express';
import { getPages, getPageAdAccounts } from '../controllers/authController';

export const authRouter = Router();

authRouter.get('/pages', getPages);
authRouter.get('/pages/:pageId/adaccounts', getPageAdAccounts);

