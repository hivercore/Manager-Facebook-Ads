import { Router } from 'express';
import { getFacebookLoginUrl, handleFacebookCallback, getPages, getAdAccounts, getPageAdAccounts } from '../controllers/authController';

export const authRouter = Router();

// Facebook OAuth endpoints
authRouter.get('/facebook/login-url', getFacebookLoginUrl);
authRouter.get('/facebook/callback', handleFacebookCallback);

// Other endpoints
authRouter.get('/pages', getPages);
authRouter.get('/adaccounts', getAdAccounts);
authRouter.get('/pages/:pageId/adaccounts', getPageAdAccounts);

