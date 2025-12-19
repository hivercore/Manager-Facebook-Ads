import { Router } from 'express';
import { getAds, getAdDetails, createAd, updateAd, deleteAd } from '../controllers/adsController';

export const adsRouter = Router();

adsRouter.get('/', getAds);
adsRouter.get('/:id', getAdDetails);
adsRouter.post('/', createAd);
adsRouter.put('/:id', updateAd);
adsRouter.delete('/:id', deleteAd);

