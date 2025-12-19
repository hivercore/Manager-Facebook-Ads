import { Request, Response } from 'express';
import { FacebookAPI } from '../services/facebookAPI';
import { accountStorage } from '../services/accountStorage';

const facebookAPI = new FacebookAPI();

export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const { accountId, accessToken: providedToken, datePreset, startDate, startTime, endDate, endTime } = req.query;

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

    const campaigns = await facebookAPI.getCampaigns(accountId as string, token);
    
    // Get account timezone (Facebook interprets date_preset/time_range based on the ad account timezone)
    let accountTimezone = 'Asia/Ho_Chi_Minh';
    // IMPORTANT: Always follow Facebook's normal behavior (account timezone).
    // Do NOT force Vietnam timezone for foreign accounts, otherwise "today/yesterday" will mismatch Ads Manager.
    const useVietnamTimezone = false;
    try {
      const accountDetails = await facebookAPI.getAccountDetails(accountId as string, token);
      accountTimezone = accountDetails.timezone_name || 'Asia/Ho_Chi_Minh';
      console.log(`[DEBUG Campaigns Controller] Account ${accountId} timezone:`, {
        timezone: accountTimezone,
        useVietnamTimezone: useVietnamTimezone,
      });
    } catch (err) {
      console.warn(`[WARNING] Could not fetch account details for timezone check:`, err);
    }
    
    // Use datePreset from query or default to 'today'
    const insightsDatePreset = (datePreset as string) || 'today';
    
    // Parse custom time range if provided
    let customTimeRange: { startDate: string; startTime: string; endDate: string; endTime: string } | undefined = undefined;
    if (startDate && startTime && endDate && endTime) {
      customTimeRange = {
        startDate: startDate as string,
        startTime: startTime as string,
        endDate: endDate as string,
        endTime: endTime as string
      };
    }
    
    // Debug: Log date preset being used
    console.log(`[DEBUG Campaigns Controller] Using datePreset: ${insightsDatePreset} for account ${accountId}`, {
      hasCustomTimeRange: !!customTimeRange,
      customTimeRange: customTimeRange
    });
    
    // Enrich campaigns with insights
    const campaignsWithInsights = await Promise.all(
      campaigns.map(async (campaign: any, index: number) => {
        try {
          const insights = await facebookAPI.getCampaignInsights(
            campaign.id, 
            token, 
            insightsDatePreset === 'custom' ? undefined : insightsDatePreset, 
            campaign.objective, 
            useVietnamTimezone, 
            accountTimezone,
            undefined, // hourRange - no longer used
            customTimeRange
          );
          
          // Debug: Log insights for first campaign
          if (index === 0) {
            console.log(`[DEBUG Campaigns Controller] First campaign ${campaign.id} insights:`, {
              datePreset: insightsDatePreset,
              spend: insights.spend,
              impressions: insights.impressions,
              clicks: insights.clicks
            });
          }
          
          // Insights are already parsed in getCampaignInsights
          // Preserve daily_budget and lifetime_budget from campaign
          return {
            ...campaign,
            daily_budget: campaign.daily_budget, // Preserve budget from campaign
            lifetime_budget: campaign.lifetime_budget, // Preserve budget from campaign
            impressions: insights.impressions || 0,
            clicks: insights.clicks || 0,
            spend: insights.spend || 0,
            reach: insights.reach || 0,
            cpm: insights.cpm || 0,
            cpc: insights.cpc || 0,
            ctr: insights.ctr || 0,
            results: insights.results || 0,
            frequency: insights.frequency || 0,
            messages: insights.messages || 0,
          };
        } catch (error: any) {
          // If insights fail, return campaign without insights
          console.error(`Error fetching insights for campaign ${campaign.id}:`, error.message);
          return {
            ...campaign,
            daily_budget: campaign.daily_budget, // Preserve budget from campaign
            lifetime_budget: campaign.lifetime_budget, // Preserve budget from campaign
            impressions: 0,
            clicks: 0,
            spend: 0,
            reach: 0,
            cpm: 0,
            cpc: 0,
            ctr: 0,
            results: 0,
            frequency: 0,
            messages: 0,
          };
        }
      })
    );
    
    res.json(campaignsWithInsights);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCampaignDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accessToken: providedToken, accountId, datePreset } = req.query;

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

    const campaign = await facebookAPI.getCampaignDetails(id, token);
    
    // Get account timezone to determine if we need timezone conversion
    let useVietnamTimezone = false; // Default: don't convert for Vietnam accounts
    if (accountId) {
      try {
        const accountDetails = await facebookAPI.getAccountDetails(accountId as string, token);
        const accountTimezone = accountDetails.timezone_name || 'Asia/Ho_Chi_Minh';
        const isVietnamAccount = accountTimezone === 'Asia/Ho_Chi_Minh' || accountTimezone.includes('Ho_Chi_Minh');
        useVietnamTimezone = !isVietnamAccount; // Only convert for non-Vietnam accounts
      } catch (err) {
        console.warn(`[WARNING] Could not fetch account details for timezone check:`, err);
      }
    }
    
    // Also get insights and time series data for this specific campaign
    const insightsDatePreset = (datePreset as string) || 'today';
    try {
      const insights = await facebookAPI.getCampaignInsights(id, token, insightsDatePreset, campaign.objective, useVietnamTimezone);
      const timeSeries = await facebookAPI.getCampaignInsightsWithBreakdown(id, token, insightsDatePreset, '1', campaign.objective, useVietnamTimezone);
      
      res.json({
        ...campaign,
        insights: insights,
        timeSeries: timeSeries
      });
    } catch (error: any) {
      // If insights fail, return campaign without insights
      console.error(`Error fetching insights for campaign ${id}:`, error.message);
      res.json(campaign);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const campaignData = req.body;
    res.json({ success: true, message: 'Chiến dịch đã được tạo thành công', campaign: campaignData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    res.json({ success: true, message: 'Chiến dịch đã được cập nhật', id, ...updateData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    res.json({ success: true, message: 'Chiến dịch đã được xóa', id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

