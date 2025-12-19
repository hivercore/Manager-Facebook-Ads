import { Request, Response } from 'express';
import { FacebookAPI } from '../services/facebookAPI';
import { accountStorage } from '../services/accountStorage';

const facebookAPI = new FacebookAPI();

export const getInsights = async (req: Request, res: Response) => {
  try {
    const { accountId, accessToken: providedToken, datePreset } = req.query;

    if (!accountId) {
      // If no accountId, aggregate all stored accounts
      const storedAccounts = accountStorage.getAllAccounts();
      if (storedAccounts.length === 0) {
        return res.json({
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          cpm: 0,
          cpc: 0,
          ctr: 0,
          conversions: 0
        });
      }

      // Aggregate insights from all accounts
      const allInsights = await Promise.all(
        storedAccounts.map(async (stored) => {
          try {
            return await facebookAPI.getInsights(
              stored.accountId,
              stored.accessToken,
              (datePreset as string) || 'today'
            );
          } catch (error: any) {
            console.error(`Error fetching insights for account ${stored.accountId}:`, error.message);
            return null;
          }
        })
      );

      const validInsights = allInsights.filter(Boolean);
      if (validInsights.length === 0) {
        return res.json({
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          cpm: 0,
          cpc: 0,
          ctr: 0,
          conversions: 0
        });
      }

      // Aggregate the insights
      const aggregated = validInsights.reduce((acc, insight: any) => {
        return {
          impressions: (acc.impressions || 0) + (insight.impressions || 0),
          clicks: (acc.clicks || 0) + (insight.clicks || 0),
          spend: (acc.spend || 0) + (insight.spend || 0),
          reach: (acc.reach || 0) + (insight.reach || 0),
          cpm: acc.cpm || insight.cpm || 0,
          cpc: acc.cpc || insight.cpc || 0,
          ctr: acc.ctr || insight.ctr || 0,
          conversions: (acc.conversions || 0) + (insight.conversions || 0),
        };
      }, {} as any);

      // Calculate averages
      aggregated.cpm = aggregated.cpm / validInsights.length;
      aggregated.cpc = aggregated.cpc / validInsights.length;
      aggregated.ctr = aggregated.ctr / validInsights.length;

      return res.json(aggregated);
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

    const insights = await facebookAPI.getInsights(
      accountId as string,
      token,
      (datePreset as string) || 'today'
    );
    
    // Also get time series data for charts
    try {
      const timeSeriesData = await facebookAPI.getInsightsWithBreakdown(
        accountId as string,
        token,
        (datePreset as string) || 'today',
        '1' // Daily breakdown
      );
      
      res.json({
        ...insights,
        timeSeries: timeSeriesData,
      });
    } catch (error) {
      // If time series fails, return basic insights
      res.json(insights);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAccountInsights = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const { accessToken: providedToken, datePreset } = req.query;

    // Try to get access token from stored accounts if not provided
    let token = providedToken as string | undefined;
    if (!token) {
      token = accountStorage.getAccessToken(accountId) || undefined;
    }

    if (!token) {
      return res.status(401).json({ 
        error: 'Không tìm thấy Access Token. Vui lòng thêm tài khoản với Access Token hợp lệ.' 
      });
    }

    const insights = await facebookAPI.getAccountInsights(
      accountId,
      token,
      (datePreset as string) || 'today'
    );
    res.json(insights);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

