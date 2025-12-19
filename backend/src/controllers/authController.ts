import { Request, Response } from 'express';
import { FacebookAPI } from '../services/facebookAPI';

const facebookAPI = new FacebookAPI();

export const getPages = async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.query;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access Token là bắt buộc' });
    }

    const pages = await facebookAPI.getPages(accessToken as string);
    res.json(pages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPageAdAccounts = async (req: Request, res: Response) => {
  try {
    const { pageId } = req.params;
    const { accessToken, userAccessToken } = req.query;

    if (!accessToken && !userAccessToken) {
      return res.status(400).json({ error: 'Access Token là bắt buộc' });
    }

    // Use user access token if available (more reliable), otherwise use page token
    const tokenToUse = (userAccessToken as string) || (accessToken as string);
    const adAccounts = await facebookAPI.getPageAdAccounts(pageId, tokenToUse);
    res.json(adAccounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

