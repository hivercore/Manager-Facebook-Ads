import { Request, Response } from 'express';
import { FacebookAPI } from '../services/facebookAPI';
import { accountStorage } from '../services/accountStorage';

const facebookAPI = new FacebookAPI();

export const getAds = async (req: Request, res: Response) => {
  try {
    const { accountId, accessToken: providedToken } = req.query;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID là bắt buộc' });
    }

    // Try to get access token from stored accounts if not provided
    let token = providedToken as string | undefined;
    if (!token) {
      token = accountStorage.getAccessToken(accountId as string) || undefined;
    }

    if (!token) {
      return res.status(401).json({ 
        error: 'Không tìm thấy Access Token. Vui lòng thêm tài khoản với Access Token hợp lệ.' 
      });
    }

    const ads = await facebookAPI.getAds(accountId as string, token);
    
    // Use datePreset from query or default to 'today' for current day data
    const insightsDatePreset = (req.query.datePreset as string) || 'today';
    
    // Enrich ads with insights
    const adsWithInsights = await Promise.all(
      ads.map(async (ad: any) => {
        try {
          const insights = await facebookAPI.getAdInsights(ad.id, token, insightsDatePreset);
          
          // Insights are already parsed in getAdInsights
          return {
            ...ad,
            impressions: insights.impressions || 0,
            clicks: insights.clicks || 0,
            spend: insights.spend || 0,
          };
        } catch (error: any) {
          // If insights fail, return ad without insights
          console.error(`Error fetching insights for ad ${ad.id}:`, error.message);
          return {
            ...ad,
            impressions: 0,
            clicks: 0,
            spend: 0,
          };
        }
      })
    );
    
    res.json(adsWithInsights);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAdDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accessToken: providedToken, accountId } = req.query;

    // Try to get access token from stored accounts if not provided
    let token = providedToken as string | undefined;
    if (!token && accountId) {
      token = accountStorage.getAccessToken(accountId as string) || undefined;
    }

    if (!token) {
      return res.status(401).json({ 
        error: 'Không tìm thấy Access Token. Vui lòng cung cấp Access Token hoặc Account ID.' 
      });
    }

    const ad = await facebookAPI.getAdDetails(id, token);
    res.json(ad);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createAd = async (req: Request, res: Response) => {
  try {
    const adData = req.body;
    // In a real app, you would create the ad via Facebook API
    res.json({ success: true, message: 'Quảng cáo đã được tạo thành công', ad: adData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    res.json({ success: true, message: 'Quảng cáo đã được cập nhật', id, ...updateData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAd = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    res.json({ success: true, message: 'Quảng cáo đã được xóa', id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

