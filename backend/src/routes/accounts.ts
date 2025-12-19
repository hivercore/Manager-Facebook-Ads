import { Router } from 'express';
import { getAccounts, getAccountDetails, addAccount, deleteAccount, updateAccountToken, refreshAccountToken } from '../controllers/accountsController';

export const accountsRouter = Router();

accountsRouter.get('/', getAccounts);
accountsRouter.get('/:id', getAccountDetails);
accountsRouter.post('/', addAccount);
accountsRouter.put('/:id/token', updateAccountToken);
accountsRouter.post('/:id/refresh-token', refreshAccountToken);
accountsRouter.delete('/:id', deleteAccount);

