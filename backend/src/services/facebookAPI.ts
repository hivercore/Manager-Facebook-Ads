import axios from 'axios';

/**
 * Convert date preset to time_range (since, until) in Vietnam timezone (UTC+7)
 * This ensures all accounts aggregate data according to Vietnam time, regardless of account timezone
 * 
 * IMPORTANT: Facebook API interprets date strings in time_range according to the account's timezone.
 * So we need to calculate the date range that, when interpreted by the account's timezone,
 * covers the Vietnam time period we want.
 */
function convertDatePresetToVietnamTimeRange(datePreset: string, accountTimezone?: string): { since: string; until: string } | null {
  // Get current time in Vietnam (UTC+7)
  const now = new Date();
  const vietnamOffsetMinutes = 7 * 60; // UTC+7 in minutes
  const vietnamNow = new Date(now.getTime() + (vietnamOffsetMinutes - now.getTimezoneOffset()) * 60000);
  
  // Set to start of day in Vietnam time (00:00:00 VN)
  const startOfTodayVN = new Date(vietnamNow);
  startOfTodayVN.setHours(0, 0, 0, 0);
  
  // Set to end of day in Vietnam time (23:59:59 VN)
  const endOfTodayVN = new Date(vietnamNow);
  endOfTodayVN.setHours(23, 59, 59, 999);
  
  // Convert Vietnam time to UTC timestamps
  const startOfTodayUTC = new Date(startOfTodayVN.getTime() - (vietnamOffsetMinutes * 60 * 1000));
  const endOfTodayUTC = new Date(endOfTodayVN.getTime() - (vietnamOffsetMinutes * 60 * 1000));
  
  let sinceVN: Date;
  let untilVN: Date = endOfTodayVN;
  
  switch (datePreset) {
    case 'today':
      sinceVN = startOfTodayVN;
      untilVN = endOfTodayVN;
      break;
      
    case 'yesterday':
      sinceVN = new Date(startOfTodayVN);
      sinceVN.setDate(sinceVN.getDate() - 1);
      untilVN = new Date(endOfTodayVN);
      untilVN.setDate(untilVN.getDate() - 1);
      break;
      
    case 'last_7d':
      sinceVN = new Date(startOfTodayVN);
      sinceVN.setDate(sinceVN.getDate() - 6); // 7 days including today
      untilVN = endOfTodayVN;
      break;
      
    case 'last_14d':
      sinceVN = new Date(startOfTodayVN);
      sinceVN.setDate(sinceVN.getDate() - 13); // 14 days including today
      untilVN = endOfTodayVN;
      break;
      
    case 'last_28d':
      sinceVN = new Date(startOfTodayVN);
      sinceVN.setDate(sinceVN.getDate() - 27); // 28 days including today
      untilVN = endOfTodayVN;
      break;
      
    case 'last_30d':
      sinceVN = new Date(startOfTodayVN);
      sinceVN.setDate(sinceVN.getDate() - 29); // 30 days including today
      untilVN = endOfTodayVN;
      break;
      
    case 'this_month':
      // First day of current month in Vietnam time
      sinceVN = new Date(vietnamNow.getFullYear(), vietnamNow.getMonth(), 1, 0, 0, 0, 0);
      untilVN = endOfTodayVN;
      break;
      
    case 'last_month':
      // First day of last month in Vietnam time
      sinceVN = new Date(vietnamNow.getFullYear(), vietnamNow.getMonth() - 1, 1, 0, 0, 0, 0);
      // Last day of last month in Vietnam time
      untilVN = new Date(vietnamNow.getFullYear(), vietnamNow.getMonth(), 0, 23, 59, 59, 999);
      break;
      
    default:
      // For other presets (like 'maximum', 'lifetime'), return null to use date_preset
      return null;
  }
  
  // Convert Vietnam time range to UTC
  const sinceUTC = new Date(sinceVN.getTime() - (vietnamOffsetMinutes * 60 * 1000));
  const untilUTC = new Date(untilVN.getTime() - (vietnamOffsetMinutes * 60 * 1000));
  
  // IMPORTANT: Facebook API interprets date strings in time_range according to the account's timezone.
  // We need to find the date range that, when interpreted by the account's timezone,
  // covers the Vietnam time period we want.
  // 
  // Strategy: Since we don't know the exact account timezone offset, we'll use a safe approach:
  // Include one day before and after the UTC date range to ensure full coverage.
  // This ensures that regardless of the account's timezone, we'll get all data for the Vietnam time period.
  
  const sinceDate = new Date(sinceUTC);
  sinceDate.setUTCDate(sinceDate.getUTCDate() - 1); // Include previous day to be safe
  
  const untilDate = new Date(untilUTC);
  untilDate.setUTCDate(untilDate.getUTCDate() + 1); // Include next day to be safe
  
  // Convert to date strings in format YYYY-MM-DD
  // Facebook API will interpret these dates according to the account's timezone
  const formatDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    since: formatDate(sinceDate),
    until: formatDate(untilDate)
  };
}

export class FacebookAPI {
  private baseURL = 'https://graph.facebook.com/v18.0';

  async getAdAccounts(accessToken: string) {
    try {
      const response = await axios.get(`${this.baseURL}/me/adaccounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,account_status,currency,timezone_name,balance,amount_spent'
        }
      });
      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getAccountDetails(accountId: string, accessToken: string) {
    try {
      const response = await axios.get(`${this.baseURL}/${accountId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,account_status,currency,timezone_name,balance,amount_spent,created_time,disable_reason,funding_source,is_prepay_account,is_notifications_enabled,spend_cap,min_campaign_group_spend_cap,min_daily_budget'
        }
      });
      
      // Debug: Log raw account details
      console.log(`[DEBUG Account Details] Account ${accountId}:`, {
        raw_balance: response.data.balance,
        raw_amount_spent: response.data.amount_spent,
        raw_spend_cap: response.data.spend_cap,
        balance_type: typeof response.data.balance,
        amount_spent_type: typeof response.data.amount_spent,
        spend_cap_type: typeof response.data.spend_cap,
        currency: response.data.currency
      });
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getCampaigns(accountId: string, accessToken: string) {
    try {
      const response = await axios.get(`${this.baseURL}/${accountId}/campaigns`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time,start_time,stop_time,effective_status'
        }
      });
      
      // Parse budget values correctly
      // Facebook API returns budget in smallest currency unit
      // For currencies like USD: 1 USD = 100 cents, so divide by 100
      // For VND: VND is already the smallest unit (no cents), so API returns directly in VND
      // Based on testing: Facebook API returns VND budgets directly (e.g., 150000 for 150k VND)
      // Only divide by 100 if the value is extremely large (likely in cents/subunits)
      const rawCampaigns = response.data.data || [];
      const campaigns = rawCampaigns.map((campaign: any, index: number) => {
        let dailyBudget = null;
        let lifetimeBudget = null;
        
        // Debug: Log raw budget values for first campaign
        if (index === 0) {
          console.log(`[DEBUG Budget] Campaign ${campaign.id} raw budget values:`, {
            daily_budget: campaign.daily_budget,
            lifetime_budget: campaign.lifetime_budget,
            daily_budget_type: typeof campaign.daily_budget,
            lifetime_budget_type: typeof campaign.lifetime_budget
          });
        }
        
        if (campaign.daily_budget !== null && campaign.daily_budget !== undefined && campaign.daily_budget !== '0') {
          const budgetValue = typeof campaign.daily_budget === 'string' 
            ? parseFloat(campaign.daily_budget) 
            : campaign.daily_budget;
          
          if (budgetValue > 0) {
            // For VND: if value is >= 10,000,000 (10 million), it's likely in smallest subunit
            // Otherwise, it's already in VND (no conversion needed)
            // For other currencies: check if value seems too large
            if (budgetValue >= 10000000) {
              // Very large number, likely in smallest subunit, divide by 100
              dailyBudget = budgetValue / 100;
            } else {
              // Already in actual currency (VND or other)
              dailyBudget = budgetValue;
            }
          }
        }
        
        if (campaign.lifetime_budget !== null && campaign.lifetime_budget !== undefined && campaign.lifetime_budget !== '0') {
          const budgetValue = typeof campaign.lifetime_budget === 'string' 
            ? parseFloat(campaign.lifetime_budget) 
            : campaign.lifetime_budget;
          
          if (budgetValue > 0) {
            // Same logic for lifetime budget
            if (budgetValue >= 10000000) {
              lifetimeBudget = budgetValue / 100;
            } else {
              lifetimeBudget = budgetValue;
            }
          }
        }
        
        // Debug: Log parsed budget values for first campaign
        if (index === 0) {
          console.log(`[DEBUG Budget] Campaign ${campaign.id} parsed budget values:`, {
            daily_budget: dailyBudget,
            lifetime_budget: lifetimeBudget
          });
        }
        
        return {
          ...campaign,
          daily_budget: dailyBudget,
          lifetime_budget: lifetimeBudget,
        };
      });
      
      return campaigns;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getCampaignDetails(campaignId: string, accessToken: string) {
    try {
      const response = await axios.get(`${this.baseURL}/${campaignId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,objective,daily_budget,lifetime_budget'
        }
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getAds(accountId: string, accessToken: string) {
    try {
      const response = await axios.get(`${this.baseURL}/${accountId}/ads`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,campaign_id,adset_id,creative{id}'
        }
      });
      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getAdDetails(adId: string, accessToken: string) {
    try {
      const response = await axios.get(`${this.baseURL}/${adId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,campaign_id,adset_id,creative'
        }
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getInsights(accountId: string, accessToken: string, datePreset: string = 'today', useVietnamTimezone: boolean = false, accountTimezone?: string) {
    try {
      // Convert date preset to time_range in Vietnam timezone if enabled
      const timeRange = useVietnamTimezone ? convertDatePresetToVietnamTimeRange(datePreset, accountTimezone) : null;
      
      const params: any = {
        access_token: accessToken,
        fields: 'impressions,clicks,spend,reach,cpm,cpc,ctr,actions,conversions'
      };
      
      if (timeRange) {
        // Use time_range for Vietnam timezone aggregation
        params.time_range = JSON.stringify({ since: timeRange.since, until: timeRange.until });
        console.log(`[DEBUG Timezone Conversion] Account ${accountId}, Date Preset: ${datePreset} -> Time Range (VN):`, {
          since: timeRange.since,
          until: timeRange.until,
          time_range_param: params.time_range
        });
      } else {
        // Use date_preset for presets that can't be converted (like 'maximum', 'lifetime')
        params.date_preset = datePreset;
      }
      
      const response = await axios.get(`${this.baseURL}/${accountId}/insights`, { params });
      
      // Facebook API returns data in data array, get first item
      // IMPORTANT: For some date presets, Facebook may return empty array or no data
      // Check if data exists
      if (!response.data.data || response.data.data.length === 0) {
        console.warn(`[WARNING Account Insights] Account ${accountId}, Date Preset: ${datePreset} - No data returned from Facebook API`);
        // Return zero values if no data
        return {
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          cpm: 0,
          cpc: 0,
          ctr: 0,
          actions: [],
        };
      }
      
      const insights = response.data.data[0];
      
      // Debug: Log raw insights data to check date preset and spend values
      console.log(`[DEBUG Account Insights] Account ${accountId}, Date Preset: ${datePreset}:`, {
        raw_spend: insights.spend,
        raw_impressions: insights.impressions,
        raw_clicks: insights.clicks,
        spend_type: typeof insights.spend,
        data_length: response.data.data?.length,
        has_insights: !!insights
      });
      
      // Parse spend - Facebook API returns spend as string or number
      // IMPORTANT: For date presets like 'last_7d', Facebook returns aggregated spend
      // Make sure we're parsing it correctly
      let spend = 0;
      if (insights.spend !== undefined && insights.spend !== null) {
        if (typeof insights.spend === 'string') {
          spend = parseFloat(insights.spend) || 0;
        } else if (typeof insights.spend === 'number') {
          spend = insights.spend;
        }
      }
      
      // Parse clicks
      const clicks = insights.clicks ? (typeof insights.clicks === 'string' ? parseInt(insights.clicks) : insights.clicks) : 0;
      const impressions = insights.impressions ? (typeof insights.impressions === 'string' ? parseInt(insights.impressions) : insights.impressions) : 0;
      
      // Debug: Log parsed values
      console.log(`[DEBUG Account Insights Parsed] Account ${accountId}, Date Preset: ${datePreset}:`, {
        raw_spend: insights.spend,
        parsed_spend: spend,
        parsed_impressions: impressions,
        parsed_clicks: clicks,
      });
      
      // Parse all numeric values correctly
      // Facebook API returns values directly in currency (VND), NOT in cents
      // Use values as-is without any division
      return {
        impressions: impressions,
        clicks: clicks,
        spend: spend,
        reach: insights.reach ? (typeof insights.reach === 'string' ? parseInt(insights.reach) : insights.reach) : 0,
        cpm: insights.cpm ? (typeof insights.cpm === 'string' ? parseFloat(insights.cpm) : insights.cpm) : 0,
        cpc: insights.cpc ? (typeof insights.cpc === 'string' ? parseFloat(insights.cpc) : insights.cpc) : 0,
        ctr: insights.ctr ? (typeof insights.ctr === 'string' ? parseFloat(insights.ctr) : insights.ctr) : 0,
        actions: insights.actions || [],
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getAccountInsights(accountId: string, accessToken: string, datePreset: string = 'last_7d') {
    return this.getInsights(accountId, accessToken, datePreset);
  }

  async getInsightsWithTimeRange(accountId: string, accessToken: string, since: string, until: string) {
    try {
      // since and until are now date strings (YYYY-MM-DD), not Unix timestamps
      // Validate format
      if (!since || !until) {
        throw new Error('since and until must be date strings in YYYY-MM-DD format');
      }
      
      const response = await axios.get(`${this.baseURL}/${accountId}/insights`, {
        params: {
          access_token: accessToken,
          time_range: JSON.stringify({ since, until }),
          fields: 'impressions,clicks,spend,reach,cpm,cpc,ctr,actions,conversions'
        }
      });
      
      // Facebook API returns data in data array, get first item
      if (!response.data.data || response.data.data.length === 0) {
        console.warn(`[WARNING All-Time Insights] Account ${accountId} - No data returned from Facebook API`);
        return {
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          cpm: 0,
          cpc: 0,
          ctr: 0,
          actions: [],
        };
      }
      
      const insights = response.data.data[0];
      
      // Parse spend
      let spend = 0;
      if (insights.spend !== undefined && insights.spend !== null) {
        if (typeof insights.spend === 'string') {
          spend = parseFloat(insights.spend) || 0;
        } else if (typeof insights.spend === 'number') {
          spend = insights.spend;
        }
      }
      
      // Parse other values
      const clicks = insights.clicks ? (typeof insights.clicks === 'string' ? parseInt(insights.clicks) : insights.clicks) : 0;
      const impressions = insights.impressions ? (typeof insights.impressions === 'string' ? parseInt(insights.impressions) : insights.impressions) : 0;
      
      return {
        impressions: impressions,
        clicks: clicks,
        spend: spend,
        reach: insights.reach ? (typeof insights.reach === 'string' ? parseInt(insights.reach) : insights.reach) : 0,
        cpm: insights.cpm ? (typeof insights.cpm === 'string' ? parseFloat(insights.cpm) : insights.cpm) : 0,
        cpc: insights.cpc ? (typeof insights.cpc === 'string' ? parseFloat(insights.cpc) : insights.cpc) : 0,
        ctr: insights.ctr ? (typeof insights.ctr === 'string' ? parseFloat(insights.ctr) : insights.ctr) : 0,
        actions: insights.actions || [],
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getInsightsWithBreakdown(accountId: string, accessToken: string, datePreset: string = 'today', timeIncrement: string = '1', useVietnamTimezone: boolean = false) {
    try {
      // Convert date preset to time_range in Vietnam timezone if enabled
      const timeRange = useVietnamTimezone ? convertDatePresetToVietnamTimeRange(datePreset) : null;
      
      const params: any = {
        access_token: accessToken,
        time_increment: timeIncrement,
        fields: 'date_start,date_stop,impressions,clicks,spend,reach,cpm,cpc,ctr,actions'
      };
      
      if (timeRange) {
        // Use time_range for Vietnam timezone aggregation
        params.time_range = JSON.stringify({ since: timeRange.since, until: timeRange.until });
        console.log(`[DEBUG Timezone Conversion Breakdown] Account ${accountId}, Date Preset: ${datePreset} -> Time Range (VN):`, {
          since: timeRange.since,
          until: timeRange.until
        });
      } else {
        // Use date_preset for presets that can't be converted
        params.date_preset = datePreset;
      }
      
      const response = await axios.get(`${this.baseURL}/${accountId}/insights`, { params });
      
      // Parse all values in time series data
      const timeSeries = (response.data.data || []).map((item: any) => ({
        date_start: item.date_start,
        date_stop: item.date_stop,
        impressions: item.impressions ? (typeof item.impressions === 'string' ? parseInt(item.impressions) : item.impressions) : 0,
        clicks: item.clicks ? (typeof item.clicks === 'string' ? parseInt(item.clicks) : item.clicks) : 0,
        spend: item.spend ? (typeof item.spend === 'string' ? parseFloat(item.spend) : item.spend) : 0,
        reach: item.reach ? (typeof item.reach === 'string' ? parseInt(item.reach) : item.reach) : 0,
        cpm: item.cpm ? (typeof item.cpm === 'string' ? parseFloat(item.cpm) : item.cpm) : 0,
        cpc: item.cpc ? (typeof item.cpc === 'string' ? parseFloat(item.cpc) : item.cpc) : 0,
        ctr: item.ctr ? (typeof item.ctr === 'string' ? parseFloat(item.ctr) : item.ctr) : 0,
        actions: item.actions || [],
      }));
      
      return timeSeries;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getCampaignInsightsWithBreakdown(campaignId: string, accessToken: string, datePreset: string = 'today', timeIncrement: string = '1', objective?: string, useVietnamTimezone: boolean = false) {
    try {
      // Convert date preset to time_range in Vietnam timezone if enabled
      const timeRange = useVietnamTimezone ? convertDatePresetToVietnamTimeRange(datePreset) : null;
      
      const params: any = {
        access_token: accessToken,
        time_increment: timeIncrement,
        fields: 'date_start,date_stop,impressions,clicks,spend,reach,cpm,cpc,ctr,actions,conversions,frequency'
      };
      
      if (timeRange) {
        // Use time_range for Vietnam timezone aggregation
        params.time_range = JSON.stringify({ since: timeRange.since, until: timeRange.until });
      } else {
        // Use date_preset for presets that can't be converted
        params.date_preset = datePreset;
      }
      
      const response = await axios.get(`${this.baseURL}/${campaignId}/insights`, { params });
      
      // Parse all values in time series data
      const timeSeries = (response.data.data || []).map((item: any) => {
        // Parse results from actions (same logic as getCampaignInsights)
        let results = 0;
        let messages = 0;
        
        if (item.actions && Array.isArray(item.actions)) {
          // Get messaging contacts
          const messagingActionTypes = [
            'onsite_conversion.messaging_contact',
            'messaging_contact',
            'messaging_conversation_started'
          ];
          
          for (const messagingType of messagingActionTypes) {
            const messagingAction = item.actions.find((a: any) => {
              if (!a || !a.action_type) return false;
              const actionType = String(a.action_type).toLowerCase();
              return actionType === messagingType.toLowerCase();
            });
            
            if (messagingAction && messagingAction.value !== null && messagingAction.value !== undefined) {
              if (typeof messagingAction.value === 'string') {
                messages = parseInt(messagingAction.value, 10) || 0;
              } else if (typeof messagingAction.value === 'number') {
                messages = messagingAction.value;
              }
              break;
            }
          }
          
          // Get purchase actions
          const purchaseActionTypes = [
            'onsite_conversion.purchase',
            'onsite_web_purchase',
            'onsite_app_purchase',
            'offsite_conversion.fb_pixel_purchase',
            'omni_purchase',
            'onsite_conversion.meta_purchase',
            'purchase'
          ];
          
          for (const purchaseType of purchaseActionTypes) {
            const action = item.actions.find((a: any) => {
              if (!a || !a.action_type) return false;
              const actionType = String(a.action_type).toLowerCase();
              return actionType === purchaseType.toLowerCase();
            });
            
            if (action && action.value !== null && action.value !== undefined) {
              if (typeof action.value === 'string') {
                results = parseInt(action.value, 10) || 0;
              } else if (typeof action.value === 'number') {
                results = action.value;
              }
              break;
            }
          }
        }
        
        return {
          date_start: item.date_start,
          date_stop: item.date_stop,
          impressions: item.impressions ? (typeof item.impressions === 'string' ? parseInt(item.impressions) : item.impressions) : 0,
          clicks: item.clicks ? (typeof item.clicks === 'string' ? parseInt(item.clicks) : item.clicks) : 0,
          spend: item.spend ? (typeof item.spend === 'string' ? parseFloat(item.spend) : item.spend) : 0,
          reach: item.reach ? (typeof item.reach === 'string' ? parseInt(item.reach) : item.reach) : 0,
          cpm: item.cpm ? (typeof item.cpm === 'string' ? parseFloat(item.cpm) : item.cpm) : 0,
          cpc: item.cpc ? (typeof item.cpc === 'string' ? parseFloat(item.cpc) : item.cpc) : 0,
          ctr: item.ctr ? (typeof item.ctr === 'string' ? parseFloat(item.ctr) : item.ctr) : 0,
          frequency: item.frequency ? (typeof item.frequency === 'string' ? parseFloat(item.frequency) : item.frequency) : 0,
          results: results,
          messages: messages,
          actions: item.actions || [],
        };
      });
      
      return timeSeries;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getCampaignInsights(
    campaignId: string, 
    accessToken: string, 
    datePreset: string = 'today', 
    objective?: string, 
    useVietnamTimezone: boolean = false, 
    accountTimezone?: string, 
    hourRange?: string,
    customTimeRange?: { startDate: string; startTime: string; endDate: string; endTime: string }
  ) {
    try {
      const params: any = {
        access_token: accessToken,
        fields: 'impressions,clicks,spend,reach,cpm,cpc,ctr,actions,conversions,frequency'
      };
      
      // If custom time range is provided, use it.
      // NOTE: Facebook's Insights API `time_range` only supports date-level granularity (YYYY-MM-DD),
      // and interprets those dates in the ad account's timezone.
      if (customTimeRange) {
        // We cannot reliably convert arbitrary "local time" across different account timezones here,
        // so we follow Facebook's standard date interpretation: pass start/end dates as-is.
        const sinceDate = customTimeRange.startDate;
        const untilDate = customTimeRange.endDate;

        params.time_range = JSON.stringify({ since: sinceDate, until: untilDate });

        console.log(`[DEBUG Custom Time Range] Campaign ${campaignId}:`, {
          accountTimezone,
          sinceDate,
          untilDate,
          startTime: customTimeRange.startTime,
          endTime: customTimeRange.endTime,
        });
      } else if (datePreset) {
        // Convert date preset to time_range in Vietnam timezone if enabled
        const timeRange = useVietnamTimezone ? convertDatePresetToVietnamTimeRange(datePreset, accountTimezone) : null;
        
        if (timeRange) {
          // Use time_range for Vietnam timezone aggregation
          params.time_range = JSON.stringify({ since: timeRange.since, until: timeRange.until });
        } else {
          // Use date_preset for presets that can't be converted
          params.date_preset = datePreset;
        }
      } else {
        // No date preset and no custom time range - use default 'today'
        params.date_preset = 'today';
        console.log(`[DEBUG Campaign Insights] No date preset or custom range, using default 'today' for ${campaignId}`);
      }
      
      console.log(`[DEBUG Campaign Insights API Params] Campaign ${campaignId}:`, {
        has_time_range: !!params.time_range,
        has_date_preset: !!params.date_preset,
        params: Object.keys(params).filter(k => k !== 'access_token')
      });
      
      let response;
      try {
        response = await axios.get(`${this.baseURL}/${campaignId}/insights`, { params });
      } catch (error: any) {
        console.error(`[ERROR Campaign Insights API Call] Campaign ${campaignId}:`, {
          error_message: error.message,
          error_response: error.response?.data,
          params_used: Object.keys(params).filter(k => k !== 'access_token')
        });
        throw error;
      }
      
      // Debug: Log full response structure
      console.log(`[DEBUG Campaign Insights Response] Campaign ${campaignId}:`, {
        has_data: !!response.data.data,
        data_length: response.data.data?.length,
        data_type: Array.isArray(response.data.data) ? 'array' : typeof response.data.data,
        first_item: response.data.data?.[0],
        full_response_keys: Object.keys(response.data || {}),
        response_data_structure: JSON.stringify(response.data).substring(0, 500)
      });
      
      // Facebook API returns data in data array, get first item
      // IMPORTANT: For some date presets, Facebook may return empty array or no data
      // Check if data exists
      if (!response.data.data || response.data.data.length === 0) {
        console.warn(`[WARNING Campaign Insights] Campaign ${campaignId}, Date Preset: ${datePreset || 'none'}, Custom Range: ${customTimeRange ? 'yes' : 'no'} - No data returned from Facebook API`, {
          response_data: response.data,
          params_used: Object.keys(params).filter(k => k !== 'access_token')
        });
        // Return zero values if no data
        return {
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
          actions: [],
        };
      }
      
      // For custom time range, we might want to filter by hour if needed
      // But for now, we'll use the aggregated data for the date range
      let insights;
      
      if (response.data.data && response.data.data.length > 0) {
        // Use first item for aggregated data
        insights = response.data.data[0];
        
        // Debug: Log raw insights structure
        console.log(`[DEBUG Campaign Insights Raw] Campaign ${campaignId}:`, {
          insights_keys: Object.keys(insights || {}),
          spend: insights?.spend,
          impressions: insights?.impressions,
          clicks: insights?.clicks,
          spend_type: typeof insights?.spend,
          impressions_type: typeof insights?.impressions,
          clicks_type: typeof insights?.clicks
        });
      }
      
      if (!insights) {
        console.warn(`[WARNING Campaign Insights] Campaign ${campaignId}, Date Preset: ${datePreset} - No insights data`);
        return {
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
          actions: [],
        };
      }
      
      // Debug: Log raw insights data to check date preset and spend values
      console.log(`[DEBUG Campaign Insights] Campaign ${campaignId}, Date Preset: ${datePreset || 'none'}, Custom Time Range: ${customTimeRange ? 'yes' : 'no'}:`, {
        raw_spend: insights.spend,
        raw_impressions: insights.impressions,
        raw_clicks: insights.clicks,
        spend_type: typeof insights.spend,
        has_insights: !!insights,
        data_length: response.data.data?.length
      });
      
      // Parse actions to get the PRIMARY result and messaging contacts
      // Facebook Ads Manager shows "Results" as purchases (either Meta purchases or Web purchases)
      // Based on the screenshot, "Kết quả" shows:
      // - For Sales campaigns: "Lượt mua trên web" (Web purchases) or "Lượt mua trên Meta" (Meta purchases)
      // - For Engagement campaigns: Also shows purchases if available, or "-" if no purchases
      // So we should prioritize purchase actions for ALL campaigns
      let results = 0;
      let messages = 0;
      
      if (insights.actions && Array.isArray(insights.actions)) {
        // Get messaging contacts count (total number of people who contacted via messages)
        // Facebook API uses: onsite_conversion.messaging_contact or messaging_contact
        const messagingActionTypes = [
          'onsite_conversion.messaging_contact',  // Primary action type for messaging contacts
          'messaging_contact',                     // Alternative action type
          'messaging_conversation_started'         // Conversation started (fallback)
        ];
        
        for (const messagingType of messagingActionTypes) {
          const messagingAction = insights.actions.find((a: any) => {
            if (!a || !a.action_type) return false;
            const actionType = String(a.action_type).toLowerCase();
            return actionType === messagingType.toLowerCase() || 
                   actionType.includes(messagingType.toLowerCase());
          });
          
          if (messagingAction && messagingAction.value !== null && messagingAction.value !== undefined) {
            if (typeof messagingAction.value === 'string') {
              messages = parseInt(messagingAction.value, 10) || 0;
            } else if (typeof messagingAction.value === 'number') {
              messages = messagingAction.value;
            }
            break; // Use first matching messaging action
          }
        }
        // Purchase action types from Facebook API
        // Based on debug logs and Facebook Ads Manager behavior:
        // Facebook Ads Manager shows ONE purchase type: "Lượt mua trên Meta" OR "Lượt mua trên web"
        // Priority order (use first available, don't sum):
        // 1. onsite_conversion.purchase (Lượt mua trên Meta) - highest priority
        // 2. onsite_web_purchase (Lượt mua trên web)
        // 3. onsite_app_purchase (Lượt mua trên app)
        // 4. offsite_conversion.fb_pixel_purchase (Lượt mua trên web via pixel)
        // 5. omni_purchase (Combined - use only if no specific types found)
        const purchaseActionTypes = [
          'onsite_conversion.purchase',                // Lượt mua trên Meta (highest priority)
          'onsite_web_purchase',                       // Lượt mua trên web
          'onsite_app_purchase',                       // Lượt mua trên app
          'offsite_conversion.fb_pixel_purchase',      // Lượt mua trên web (via pixel)
          'omni_purchase',                             // Combined purchase (fallback only)
          'onsite_conversion.meta_purchase',           // Alternative format
          'purchase'                                   // Generic purchase (lowest priority)
        ];
        
        // Debug: Log all actions to see what Facebook API returns
        console.log(`[DEBUG Campaign Insights] Campaign ${campaignId}:`, {
          objective: objective,
          datePreset: datePreset,
          actions: insights.actions?.map((a: any) => ({
            action_type: a.action_type,
            value: a.value
          })) || []
        });
        
        // Find purchase action in priority order - use EXACT match only
        // Use first matching purchase action (don't sum, as Facebook shows one type)
        for (const purchaseType of purchaseActionTypes) {
          const action = insights.actions.find((a: any) => {
            if (!a || !a.action_type) return false;
            const actionType = String(a.action_type).toLowerCase();
            // Use EXACT match only
            return actionType === purchaseType.toLowerCase();
          });
          
          if (action && action.value !== null && action.value !== undefined) {
            // Parse value - can be string or number
            if (typeof action.value === 'string') {
              results = parseInt(action.value, 10) || 0;
            } else if (typeof action.value === 'number') {
              results = action.value;
            }
            console.log(`[DEBUG] Found purchase action: ${action.action_type} = ${results}`);
            break; // Use first matching purchase action (don't continue to sum)
          }
        }
        
        // If no purchase found, check objective-specific actions
        if (results === 0) {
          const obj = (objective || '').toUpperCase();
          
          if (obj === 'OUTCOME_LEADS' || obj === 'LEAD_GENERATION') {
            // For leads: use lead actions
            const leadAction = insights.actions.find((a: any) => {
              if (!a || !a.action_type) return false;
              const actionType = String(a.action_type).toLowerCase();
              return actionType.includes('lead');
            });
            
            if (leadAction && leadAction.value !== null && leadAction.value !== undefined) {
              if (typeof leadAction.value === 'string') {
                results = parseInt(leadAction.value, 10) || 0;
              } else if (typeof leadAction.value === 'number') {
                results = leadAction.value;
              }
            }
          } else if (obj === 'OUTCOME_TRAFFIC' || obj === 'LINK_CLICKS') {
            // For traffic: use link clicks
            const linkClickAction = insights.actions.find((a: any) => {
              if (!a || !a.action_type) return false;
              const actionType = String(a.action_type).toLowerCase();
              return actionType === 'link_click';
            });
            
            if (linkClickAction && linkClickAction.value !== null && linkClickAction.value !== undefined) {
              if (typeof linkClickAction.value === 'string') {
                results = parseInt(linkClickAction.value, 10) || 0;
              } else if (typeof linkClickAction.value === 'number') {
                results = linkClickAction.value;
              }
            }
          }
          // For engagement and other objectives: if no purchase, results = 0 (will show as "-" in UI)
        }
      }
      
      // Also check if Facebook API returns conversions field directly (some API versions)
      if (results === 0 && insights.conversions !== undefined && insights.conversions !== null) {
        const conversionsValue = typeof insights.conversions === 'string' 
          ? parseInt(insights.conversions, 10) 
          : (typeof insights.conversions === 'number' ? insights.conversions : 0);
        if (conversionsValue > 0) {
          results = conversionsValue;
        }
      }
      
      // Parse all numeric values correctly - Facebook API returns strings
      const impressions = insights.impressions ? (typeof insights.impressions === 'string' ? parseInt(insights.impressions) : insights.impressions) : 0;
      const reach = insights.reach ? (typeof insights.reach === 'string' ? parseInt(insights.reach) : insights.reach) : 0;
      
      // Calculate frequency if not provided by API: frequency = impressions / reach
      let frequency = 0;
      if (insights.frequency !== undefined && insights.frequency !== null) {
        frequency = typeof insights.frequency === 'string' ? parseFloat(insights.frequency) : insights.frequency;
      } else if (reach > 0 && impressions > 0) {
        frequency = impressions / reach;
      }
      
      // Parse spend - Facebook API returns spend as string or number
      // IMPORTANT: For date presets like 'last_7d', Facebook returns aggregated spend
      // Make sure we're parsing it correctly
      let spend = 0;
      if (insights.spend !== undefined && insights.spend !== null) {
        if (typeof insights.spend === 'string') {
          spend = parseFloat(insights.spend) || 0;
        } else if (typeof insights.spend === 'number') {
          spend = insights.spend;
        }
      }
      
      // Parse clicks
      const clicks = insights.clicks ? (typeof insights.clicks === 'string' ? parseInt(insights.clicks) : insights.clicks) : 0;
      
      // Debug: Log parsed values
      console.log(`[DEBUG Campaign Insights Parsed] Campaign ${campaignId}, Date Preset: ${datePreset || 'none'}:`, {
        raw_spend: insights.spend,
        parsed_spend: spend,
        raw_impressions: insights.impressions,
        parsed_impressions: impressions,
        raw_clicks: insights.clicks,
        parsed_clicks: clicks,
        parsed_reach: reach,
        parsed_results: results,
        parsed_messages: messages,
        parsed_frequency: frequency,
        parsed_cpm: insights.cpm ? (typeof insights.cpm === 'string' ? parseFloat(insights.cpm) : insights.cpm) : 0,
        parsed_cpc: insights.cpc ? (typeof insights.cpc === 'string' ? parseFloat(insights.cpc) : insights.cpc) : 0,
        parsed_ctr: insights.ctr ? (typeof insights.ctr === 'string' ? parseFloat(insights.ctr) : insights.ctr) : 0,
      });
      
      const result = {
        impressions: impressions,
        clicks: clicks,
        spend: spend,
        reach: reach,
        cpm: insights.cpm ? (typeof insights.cpm === 'string' ? parseFloat(insights.cpm) : insights.cpm) : 0,
        cpc: insights.cpc ? (typeof insights.cpc === 'string' ? parseFloat(insights.cpc) : insights.cpc) : 0,
        ctr: insights.ctr ? (typeof insights.ctr === 'string' ? parseFloat(insights.ctr) : insights.ctr) : 0,
        results: results,
        frequency: frequency,
        messages: messages,
        actions: insights.actions || [],
      };
      
      // Final debug: Log what we're returning
      console.log(`[DEBUG Campaign Insights Final Return] Campaign ${campaignId}:`, result);
      
      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getAdInsights(adId: string, accessToken: string, datePreset: string = 'today') {
    try {
      const response = await axios.get(`${this.baseURL}/${adId}/insights`, {
        params: {
          access_token: accessToken,
          date_preset: datePreset,
          fields: 'impressions,clicks,spend,reach,cpm,cpc,ctr,actions,conversions'
        }
      });
      
      const insights = response.data.data?.[0] || {};
      
      // Parse all numeric values correctly - Facebook API returns strings
      return {
        impressions: insights.impressions ? (typeof insights.impressions === 'string' ? parseInt(insights.impressions) : insights.impressions) : 0,
        clicks: insights.clicks ? (typeof insights.clicks === 'string' ? parseInt(insights.clicks) : insights.clicks) : 0,
        spend: insights.spend ? (typeof insights.spend === 'string' ? parseFloat(insights.spend) : insights.spend) : 0,
        reach: insights.reach ? (typeof insights.reach === 'string' ? parseInt(insights.reach) : insights.reach) : 0,
        cpm: insights.cpm ? (typeof insights.cpm === 'string' ? parseFloat(insights.cpm) : insights.cpm) : 0,
        cpc: insights.cpc ? (typeof insights.cpc === 'string' ? parseFloat(insights.cpc) : insights.cpc) : 0,
        ctr: insights.ctr ? (typeof insights.ctr === 'string' ? parseFloat(insights.ctr) : insights.ctr) : 0,
        actions: insights.actions || [],
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getPages(userAccessToken: string) {
    try {
      const response = await axios.get(`${this.baseURL}/me/accounts`, {
        params: {
          access_token: userAccessToken,
          fields: 'id,name,access_token,category,picture'
        }
      });
      return response.data.data || [];
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for token expiration
      if (errorMessage?.includes('Session has expired') || 
          errorMessage?.includes('expired') ||
          errorCode === 190 ||
          errorType === 'OAuthException') {
        const expiredError: any = new Error(`Token đã hết hạn: ${errorMessage}`);
        expiredError.isTokenExpired = true;
        expiredError.code = errorCode;
        throw expiredError;
      }
      
      throw new Error(`Facebook API Error: ${errorMessage}`);
    }
  }

  async getPageAdAccounts(pageId: string, accessToken: string) {
    try {
      // Use the access token (preferably user token) to get ad accounts
      // The user token should have ads_read permission
      const adAccountsResponse = await axios.get(`${this.baseURL}/me/adaccounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,account_status,currency,timezone_name'
        }
      });

      const accounts = adAccountsResponse.data.data || [];

      // If we have accounts, return them
      if (accounts.length > 0) {
        return accounts;
      }

      // Fallback: Try to get ad accounts through business
      try {
        const pageResponse = await axios.get(`${this.baseURL}/${pageId}`, {
          params: {
            access_token: accessToken,
            fields: 'business'
          }
        });

        const businessId = pageResponse.data.business?.id;

        if (businessId) {
          const businessAccountsResponse = await axios.get(`${this.baseURL}/${businessId}/owned_ad_accounts`, {
            params: {
              access_token: accessToken,
              fields: 'id,name,account_status,currency,timezone_name'
            }
          });

          return businessAccountsResponse.data.data || [];
        }
      } catch (businessError) {
        // Continue
      }

      return [];
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Không thể lấy danh sách tài khoản quảng cáo: ${errorMessage}`);
    }
  }

  /**
   * Exchange short-lived token to long-lived token
   * Long-lived tokens can last up to 60 days
   */
  async exchangeToLongLivedToken(shortLivedToken: string, appId: string, appSecret: string): Promise<{ access_token: string; expires_in: number }> {
    try {
      const response = await axios.get(`${this.baseURL}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        }
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Facebook Token Exchange Error: ${errorMessage}`);
    }
  }

  /**
   * Get token information including expiration time
   */
  async getTokenInfo(accessToken: string): Promise<{ expires_at?: number; data_access_expires_at?: number; type?: string }> {
    try {
      // Need to use app access token or user token to debug another token
      // For now, we'll use the token itself (works if it's a user token)
      const response = await axios.get(`${this.baseURL}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: accessToken,
        }
      });
      return response.data.data || {};
    } catch (error: any) {
      // If debug fails, try with app access token if available
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (appId && appSecret) {
        try {
          // Get app access token
          const appTokenResponse = await axios.get(`${this.baseURL}/oauth/access_token`, {
            params: {
              client_id: appId,
              client_secret: appSecret,
              grant_type: 'client_credentials',
            }
          });
          
          const appToken = appTokenResponse.data.access_token;
          
          // Debug with app token
          const debugResponse = await axios.get(`${this.baseURL}/debug_token`, {
            params: {
              input_token: accessToken,
              access_token: appToken,
            }
          });
          return debugResponse.data.data || {};
        } catch (debugError: any) {
          const errorMessage = error.response?.data?.error?.message || error.message;
          throw new Error(`Facebook Token Debug Error: ${errorMessage}`);
        }
      }
      
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Facebook Token Debug Error: ${errorMessage}`);
    }
  }
}

