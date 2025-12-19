import { Request, Response } from 'express';
import { FacebookAPI } from '../services/facebookAPI';
import { accountStorage } from '../services/accountStorage';

const facebookAPI = new FacebookAPI();

export const getAccounts = async (req: Request, res: Response) => {
  try {
    const storedAccounts = accountStorage.getAllAccounts();
    
    if (storedAccounts.length === 0) {
      return res.json([]);
    }

    // Get datePreset from query, default to 'today'
    const datePreset = (req.query.datePreset as string) || 'today';
    
    // Debug: Log date preset being used
    console.log(`[DEBUG Accounts Controller] Using datePreset: ${datePreset} for ${storedAccounts.length} accounts`);

    // Fetch account details and insights from Facebook API for each stored account
    const accountsWithDetails = await Promise.all(
      storedAccounts.map(async (stored) => {
        try {
          // Fetch account details (contains amount_spent - all-time spend)
          const accountDetails = await facebookAPI.getAccountDetails(stored.accountId, stored.accessToken);
          
          const accountTimezone = accountDetails.timezone_name || 'Asia/Ho_Chi_Minh';
          // IMPORTANT: Always follow Facebook's normal behavior (account timezone).
          // Do NOT force Vietnam timezone for foreign accounts, otherwise "today/yesterday" will mismatch Ads Manager.
          const useVietnamTimezone = false;
          
          console.log(`[DEBUG Account Timezone] Account ${stored.accountId}:`, {
            timezone: accountTimezone,
            useVietnamTimezone: useVietnamTimezone
          });
          
          // Fetch insights for the selected date preset (date-specific spend)
          const insights = await facebookAPI.getInsights(stored.accountId, stored.accessToken, datePreset, useVietnamTimezone, accountTimezone).catch((err) => {
            console.error(`[DEBUG Accounts Controller] Error fetching insights for account ${stored.accountId}:`, err.message);
            return null;
          });
          
          // IMPORTANT: Also fetch all-time insights using time_range to get accurate all-time spend
          // Sometimes amount_spent from AdAccount API might not be accurate or cached
          // Use time_range with date strings (YYYY-MM-DD) to get all-time data
          let allTimeInsights = null;
          try {
            // Get account creation date or use a very old date (e.g., 2010-01-01)
            // Use date strings (YYYY-MM-DD) for time_range
            const sinceDate = '2010-01-01'; // Start from a very old date
            const untilDate = new Date().toISOString().split('T')[0]; // Today in YYYY-MM-DD format
            
            allTimeInsights = await facebookAPI.getInsightsWithTimeRange(
              stored.accountId, 
              stored.accessToken, 
              sinceDate, 
              untilDate
            );
            console.log(`[DEBUG All-Time Insights] Account ${stored.accountId}:`, {
              all_time_spend: allTimeInsights.spend,
              amount_spent_from_account: accountDetails.amount_spent
            });
          } catch (err) {
            console.warn(`[WARNING] Could not fetch all-time insights for account ${stored.accountId}:`, err);
          }
          
          // Debug: Log insights for first account
          if (storedAccounts.indexOf(stored) === 0 && insights) {
            console.log(`[DEBUG Accounts Controller] First account ${stored.accountId} insights:`, {
              datePreset: datePreset,
              spend: insights.spend,
              impressions: insights.impressions,
              clicks: insights.clicks
            });
          }
          
          // Debug: Log raw values from API
          console.log(`[DEBUG] Account ${stored.accountId}:`, {
            balance_raw: accountDetails.balance,
            spend_cap_raw: accountDetails.spend_cap,
            amount_spent_raw: accountDetails.amount_spent,
            currency: accountDetails.currency,
            is_prepay: accountDetails.is_prepay_account
          });
          
          // Determine actual account status
          const accountStatus = accountDetails.account_status || 1;
          const disableReason = accountDetails.disable_reason;
          const isPrepay = accountDetails.is_prepay_account;
          
          // Parse balance, spendCap, amount_spent
          // Facebook API returns these values directly in currency (VND), NOT in cents
          // Use values as-is without any division
          // IMPORTANT: amount_spent is ALL-TIME spend (from account creation to now), not date-specific
          const balance = parseFloat(accountDetails.balance || '0');
          const spendCapValue = parseFloat(accountDetails.spend_cap || '0');
          
          // Parse amount_spent - can be string or number
          // IMPORTANT: Use lifetime insights spend if available, as it's more accurate than amount_spent
          // amount_spent from AdAccount API might be cached or not updated
          let spendValue = 0;
          
          // Priority: Use all-time insights spend if available (most accurate for all-time spend)
          if (allTimeInsights && allTimeInsights.spend) {
            spendValue = typeof allTimeInsights.spend === 'string' 
              ? parseFloat(allTimeInsights.spend) || 0
              : allTimeInsights.spend;
            console.log(`[DEBUG Account Spend] Account ${stored.accountId}: Using all-time insights spend = ${spendValue}`);
          } else if (accountDetails.amount_spent !== undefined && accountDetails.amount_spent !== null) {
            // Fallback to amount_spent from AdAccount API
            if (typeof accountDetails.amount_spent === 'string') {
              spendValue = parseFloat(accountDetails.amount_spent) || 0;
            } else if (typeof accountDetails.amount_spent === 'number') {
              spendValue = accountDetails.amount_spent;
            }
            console.log(`[DEBUG Account Spend] Account ${stored.accountId}: Using amount_spent from AdAccount = ${spendValue}`);
          }
          
          // Debug: Log spend parsing
          console.log(`[DEBUG Account Spend] Account ${stored.accountId}:`, {
            raw_amount_spent: accountDetails.amount_spent,
            amount_spent_type: typeof accountDetails.amount_spent,
            all_time_insights_spend: allTimeInsights?.spend,
            parsed_spendValue: spendValue,
            date_preset_insights_spend: insights?.spend,
            date_preset: datePreset,
            currency: accountDetails.currency,
            are_equal: spendValue === (insights?.spend || 0)
          });
          
          // Check if account is actually active
          // account_status: 1=ACTIVE, 2=DISABLED, 3=UNSETTLED, 7=PENDING_RISK_REVIEW, 
          // 8=IN_GRACE_PERIOD, 9=PENDING_SETTLEMENT, 100=PENDING_CLOSURE
          let effectiveStatus = accountStatus;
          let statusMessage = '';
          
          // Priority order: Check disable reason first, then account status, then balance
          // disable_reason codes: 0=No reason, 1=Policy violation, 2=Suspicious activity, 
          // 3=Payment issue, 4=User request, 5=Payment overdue
          if (disableReason === 5 || accountStatus === 8) {
            // Quá hạn thanh toán (Payment overdue)
            effectiveStatus = 8;
            statusMessage = 'Quá hạn thanh toán';
          } else if (accountStatus === 2 || disableReason) {
            // Account is disabled
            effectiveStatus = 2;
            if (disableReason) {
              // Map disable reasons to Vietnamese
              const reasonMap: Record<number, string> = {
                0: 'Tài khoản bị vô hiệu hóa',
                1: 'Vi phạm chính sách quảng cáo',
                2: 'Hoạt động đáng ngờ',
                3: 'Vấn đề thanh toán',
                4: 'Yêu cầu của người dùng',
                5: 'Quá hạn thanh toán',
              };
              statusMessage = reasonMap[disableReason] || `Lý do: ${disableReason}`;
            } else {
              statusMessage = 'Tài khoản bị vô hiệu hóa';
            }
          } else if (accountStatus === 3 || accountStatus === 9) {
            // Unsettled or pending settlement
            effectiveStatus = 3;
            statusMessage = 'Chưa thanh toán';
          } else if (accountStatus === 1) {
            // Status is ACTIVE, but check if account can actually run ads
            if (isPrepay && balance <= 0) {
              // Prepay account with no balance - can't run ads
              effectiveStatus = 0;
              statusMessage = 'Hết số dư';
            } else if (balance < 0) {
              // Negative balance - payment issue
              effectiveStatus = 8;
              statusMessage = 'Số dư âm - Cần thanh toán';
            } else {
              // Truly active
              effectiveStatus = 1;
            }
          } else {
            // Other statuses
            effectiveStatus = accountStatus;
            statusMessage = `Trạng thái: ${accountStatus}`;
          }
          
          // Calculate amount needed to top up
          // For prepay accounts: amount needed = negative balance (if balance is negative)
          // For postpay accounts: amount needed = 0 (they pay after spending)
          let amountNeeded = 0;
          if (isPrepay) {
            // Prepay accounts: if balance is negative, need to top up
            if (balance < 0) {
              amountNeeded = Math.abs(balance);
            }
            // If balance is low but positive, we can't determine threshold without additional API calls
            // So we'll set amountNeeded to 0 for now
          } else {
            // Postpay accounts: no need to top up (they pay after spending)
            amountNeeded = 0;
          }
          
          // Debug: Compare amount_spent (all-time) vs insights.spend (date-specific)
          if (insights) {
            console.log(`[DEBUG Account Spend Comparison] Account ${stored.accountId}:`, {
              datePreset: datePreset,
              amount_spent_all_time: spendValue,
              insights_spend_date_specific: insights.spend,
              are_equal: spendValue === insights.spend,
              difference: spendValue - (insights.spend || 0)
            });
          }
          
          return {
            id: stored.accountId,
            name: stored.name || accountDetails.name || stored.accountId,
            accountStatus: effectiveStatus,
            accountStatusRaw: accountStatus,
            disableReason: disableReason,
            statusMessage: statusMessage,
            currency: accountDetails.currency || 'VND',
            timezoneName: accountDetails.timezone_name || 'Asia/Ho_Chi_Minh',
            balance: balance.toString(),
            spend: spendValue.toString(), // Total spend (all time) from amount_spent
            fundingSource: accountDetails.funding_source,
            isPrepayAccount: accountDetails.is_prepay_account,
            spendCap: spendCapValue.toString(), // Spending limit
            amountOwed: '0', // Not available in AdAccount API
            amountNeeded: amountNeeded.toString(), // Calculated amount needed to top up
            // Insights for date-specific period (based on datePreset)
            insights: insights ? {
              spend: insights.spend?.toString() || '0',
              impressions: insights.impressions?.toString() || '0',
              clicks: insights.clicks?.toString() || '0',
              ctr: insights.ctr?.toString() || '0',
              cpm: insights.cpm?.toString() || '0',
              reach: insights.reach?.toString() || '0',
            } : null,
            storedId: stored.id,
            tokenExpiresAt: stored.tokenExpiresAt,
          };
        } catch (error: any) {
          // If API call fails, return basic info with error details
          const isTokenExpired = error.isTokenExpired || error.message?.includes('expired') || error.message?.includes('Session has expired');
          
          return {
            id: stored.accountId,
            name: stored.name || stored.accountId,
            accountStatus: 0,
            currency: 'VND',
            timezoneName: 'Asia/Ho_Chi_Minh',
            balance: '0',
            spend: '0',
            insights: null,
            storedId: stored.id,
            error: error.message,
            tokenExpired: isTokenExpired,
            tokenExpiresAt: stored.tokenExpiresAt,
          };
        }
      })
    );

    res.json(accountsWithDetails);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAccountDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Try to find in stored accounts first
    const storedAccounts = accountStorage.getAllAccounts();
    const stored = storedAccounts.find(acc => acc.accountId === id || acc.id === id);
    
    if (stored) {
      try {
        const account = await facebookAPI.getAccountDetails(stored.accountId, stored.accessToken);
        res.json({
          ...account,
          storedId: stored.id,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    } else {
      res.status(404).json({ error: 'Tài khoản không tìm thấy' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addAccount = async (req: Request, res: Response) => {
  try {
    const { accountId, accessToken, name } = req.body;

    // Validate required fields
    if (!accountId || !accessToken) {
      return res.status(400).json({ 
        error: 'Account ID và Access Token là bắt buộc' 
      });
    }

    // Check if account already exists
    const existingAccounts = accountStorage.getAllAccounts();
    const existing = existingAccounts.find(acc => acc.accountId === accountId);
    if (existing) {
      return res.status(400).json({ 
        error: 'Tài khoản này đã được thêm vào hệ thống' 
      });
    }

    // Verify the account by fetching details from Facebook API
    try {
      // Try to exchange to long-lived token if app credentials are available
      // App ID and Secret should be configured in backend .env (not user input)
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      let finalToken = accessToken;
      let expiresAt: number | undefined;
      
      if (appId && appSecret) {
        try {
          // Exchange to long-lived token (lasts 60 days)
          const longLived = await facebookAPI.exchangeToLongLivedToken(
            accessToken,
            appId,
            appSecret
          );
          finalToken = longLived.access_token;
          
          // Get token info to determine expiration
          try {
            const tokenInfo = await facebookAPI.getTokenInfo(finalToken);
            // expires_at is in seconds, convert to milliseconds
            expiresAt = tokenInfo.expires_at ? tokenInfo.expires_at * 1000 : undefined;
          } catch (tokenInfoError) {
            // If we can't get token info, calculate from expires_in (in seconds)
            // Long-lived tokens typically last 60 days
            expiresAt = longLived.expires_in 
              ? Date.now() + (longLived.expires_in * 1000)
              : Date.now() + (60 * 24 * 60 * 60 * 1000); // Default to 60 days
          }
        } catch (exchangeError: any) {
          // If exchange fails, still use original token (short-lived, ~1-2 hours)
          console.warn('Could not exchange to long-lived token:', exchangeError.message);
          // Try to get expiration info from original token
          try {
            const tokenInfo = await facebookAPI.getTokenInfo(accessToken);
            expiresAt = tokenInfo.expires_at ? tokenInfo.expires_at * 1000 : undefined;
          } catch (tokenInfoError) {
            // If we can't get info, leave expiresAt undefined
            // Token will work but we won't know expiration time
          }
        }
      } else {
        // If no app credentials configured, use original token
        // Note: For production, App ID and Secret should be configured in backend .env
        console.warn('Facebook App ID and Secret not configured. Using short-lived token.');
        try {
          const tokenInfo = await facebookAPI.getTokenInfo(accessToken);
          expiresAt = tokenInfo.expires_at ? tokenInfo.expires_at * 1000 : undefined;
        } catch (tokenInfoError) {
          // Ignore if we can't get token info
        }
      }
      
      // Validate account ID format (should start with "act_")
      if (!accountId.startsWith('act_')) {
        return res.status(400).json({ 
          error: 'Account ID không hợp lệ. Account ID phải bắt đầu bằng "act_" (ví dụ: act_123456789).',
          details: `Account ID nhận được: ${accountId}`
        });
      }
      
      // Verify the account by fetching details from Facebook API
      const accountDetails = await facebookAPI.getAccountDetails(accountId, finalToken);
      
      // Generate a unique ID for storage
      const storageId = `stored_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store the account
      const storedAccount = accountStorage.addAccount({
        id: storageId,
        accountId: accountId,
        accessToken: finalToken,
        name: name || accountDetails.name || accountId,
        tokenExpiresAt: expiresAt,
      });

      res.json({ 
        success: true, 
        message: 'Tài khoản đã được thêm thành công',
        account: {
          id: storedAccount.accountId,
          name: storedAccount.name,
          storedId: storedAccount.id,
        }
      });
    } catch (error: any) {
      // If Facebook API call fails, provide more specific error messages
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;
      
      // Check for specific error types
      if (error.isTokenExpired || errorCode === 190 || errorType === 'OAuthException') {
        return res.status(400).json({ 
          error: 'Access Token đã hết hạn hoặc không hợp lệ.',
          details: errorMessage,
          suggestion: 'Vui lòng lấy Access Token mới từ Facebook Graph API Explorer hoặc đăng nhập lại Facebook.'
        });
      }
      
      if (errorCode === 100) {
        return res.status(400).json({ 
          error: 'Account ID không tồn tại hoặc không có quyền truy cập.',
          details: errorMessage,
          suggestion: 'Vui lòng kiểm tra lại Account ID và đảm bảo Access Token có quyền ads_read và ads_management.'
        });
      }
      
      if (errorCode === 10) {
        return res.status(400).json({ 
          error: 'Access Token không có quyền truy cập tài khoản quảng cáo này.',
          details: errorMessage,
          suggestion: 'Vui lòng đảm bảo Access Token có các quyền: ads_read, ads_management.'
        });
      }
      
      // Generic error
      return res.status(400).json({ 
        error: 'Không thể xác thực tài khoản. Vui lòng kiểm tra lại Account ID và Access Token.',
        details: errorMessage,
        errorCode: errorCode,
        errorType: errorType,
        suggestion: 'Vui lòng kiểm tra:\n1. Account ID có đúng format (bắt đầu bằng "act_")\n2. Access Token còn hiệu lực và có quyền ads_read, ads_management\n3. Tài khoản quảng cáo thuộc về user/Page của Access Token'
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAccountToken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ 
        error: 'Access Token là bắt buộc' 
      });
    }

    // Find the stored account
    const stored = accountStorage.getAccount(id);
    if (!stored) {
      return res.status(404).json({ 
        error: 'Tài khoản không tìm thấy' 
      });
    }

    // Verify the new token by fetching account details
    try {
      // Try to exchange to long-lived token if app credentials are available
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      let finalToken = accessToken;
      let expiresAt: number | undefined;
      
      if (appId && appSecret) {
        try {
          // Exchange to long-lived token
          const longLived = await facebookAPI.exchangeToLongLivedToken(
            accessToken,
            appId,
            appSecret
          );
          finalToken = longLived.access_token;
          
          // Get token info to determine expiration
          try {
            const tokenInfo = await facebookAPI.getTokenInfo(finalToken);
            expiresAt = tokenInfo.expires_at ? tokenInfo.expires_at * 1000 : undefined;
          } catch (tokenInfoError) {
            // Calculate from expires_in
            expiresAt = longLived.expires_in 
              ? Date.now() + (longLived.expires_in * 1000)
              : Date.now() + (60 * 24 * 60 * 60 * 1000);
          }
        } catch (exchangeError) {
          // If exchange fails, still use original token
          console.warn('Could not exchange to long-lived token:', exchangeError);
          try {
            const tokenInfo = await facebookAPI.getTokenInfo(accessToken);
            expiresAt = tokenInfo.expires_at ? tokenInfo.expires_at * 1000 : undefined;
          } catch (tokenInfoError) {
            // Ignore
          }
        }
      } else {
        try {
          const tokenInfo = await facebookAPI.getTokenInfo(accessToken);
          expiresAt = tokenInfo.expires_at ? tokenInfo.expires_at * 1000 : undefined;
        } catch (tokenInfoError) {
          // Ignore
        }
      }
      
      const accountDetails = await facebookAPI.getAccountDetails(stored.accountId, finalToken);
      
      // Update the access token
      const updatedAccount = accountStorage.updateAccount(id, {
        accessToken: finalToken,
        name: accountDetails.name || stored.name,
        tokenExpiresAt: expiresAt,
      });

      if (updatedAccount) {
        res.json({ 
          success: true, 
          message: 'Token đã được cập nhật thành công',
          account: {
            id: updatedAccount.accountId,
            name: updatedAccount.name,
            storedId: updatedAccount.id,
          }
        });
      } else {
        res.status(500).json({ 
          error: 'Không thể cập nhật token' 
        });
      }
    } catch (error: any) {
      // If Facebook API call fails, the token might be invalid
      res.status(400).json({ 
        error: 'Token không hợp lệ. Vui lòng kiểm tra lại Access Token.',
        details: error.message
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const refreshAccountToken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      return res.status(400).json({ 
        error: 'Facebook App ID và App Secret cần được cấu hình để refresh token. Vui lòng thêm FACEBOOK_APP_ID và FACEBOOK_APP_SECRET vào file .env' 
      });
    }

    const stored = accountStorage.getAccount(id);
    if (!stored) {
      return res.status(404).json({ 
        error: 'Tài khoản không tìm thấy' 
      });
    }

    try {
      // Exchange to long-lived token
      const longLived = await facebookAPI.exchangeToLongLivedToken(
        stored.accessToken,
        appId,
        appSecret
      );
      
      // Get token info to determine expiration
      let expiresAt: number | undefined;
      try {
        const tokenInfo = await facebookAPI.getTokenInfo(longLived.access_token);
        expiresAt = tokenInfo.expires_at ? tokenInfo.expires_at * 1000 : undefined;
      } catch (tokenInfoError) {
        // Calculate from expires_in
        expiresAt = longLived.expires_in 
          ? Date.now() + (longLived.expires_in * 1000)
          : Date.now() + (60 * 24 * 60 * 60 * 1000);
      }
      
      // Verify the new token works
      await facebookAPI.getAccountDetails(stored.accountId, longLived.access_token);
      
      // Update the token
      const updatedAccount = accountStorage.updateAccount(id, {
        accessToken: longLived.access_token,
        tokenExpiresAt: expiresAt,
      });

      if (updatedAccount) {
        res.json({ 
          success: true, 
          message: 'Token đã được refresh thành công',
          expiresAt: expiresAt,
          expiresAtFormatted: expiresAt ? new Date(expiresAt).toLocaleString('vi-VN') : null,
          account: {
            id: updatedAccount.accountId,
            name: updatedAccount.name,
            storedId: updatedAccount.id,
          }
        });
      } else {
        res.status(500).json({ 
          error: 'Không thể cập nhật token' 
        });
      }
    } catch (error: any) {
      // Check if it's a token expiration error
      if (error.isTokenExpired || error.message?.includes('expired')) {
        res.status(400).json({ 
          error: 'Token hiện tại đã hết hạn hoàn toàn. Vui lòng cập nhật token mới bằng cách đăng nhập lại Facebook.',
          details: error.message
        });
      } else {
        res.status(400).json({ 
          error: 'Không thể refresh token. Vui lòng kiểm tra lại cấu hình App ID và App Secret.',
          details: error.message
        });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Try to find by storedId first, then by accountId
    const storedAccounts = accountStorage.getAllAccounts();
    const stored = storedAccounts.find(acc => acc.id === id || acc.accountId === id);
    
    if (!stored) {
      return res.status(404).json({ error: 'Tài khoản không tìm thấy' });
    }

    const deleted = accountStorage.deleteAccount(stored.id);
    
    if (deleted) {
      res.json({ 
        success: true, 
        message: 'Tài khoản đã được xóa thành công' 
      });
    } else {
      res.status(500).json({ error: 'Không thể xóa tài khoản' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

