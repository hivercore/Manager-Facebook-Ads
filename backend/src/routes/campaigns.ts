import { Router } from 'express';
import { getCampaigns, getCampaignDetails, createCampaign, updateCampaign, deleteCampaign } from '../controllers/campaignsController';

export const campaignsRouter = Router();

campaignsRouter.get('/', getCampaigns);
campaignsRouter.get('/:id', getCampaignDetails);
campaignsRouter.post('/', createCampaign);
campaignsRouter.put('/:id', updateCampaign);
campaignsRouter.delete('/:id', deleteCampaign);

