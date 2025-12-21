import { Request, Response } from 'express';
import { FacebookAPI } from '../services/facebookAPI';
import axios from 'axios';

const facebookAPI = new FacebookAPI();

// Get Facebook OAuth login URL
export const getFacebookLoginUrl = async (req: Request, res: Response) => {
  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
    
    if (!appId) {
      return res.status(500).json({ 
        error: 'Facebook App ID chưa được cấu hình trên server. Vui lòng liên hệ quản trị viên.' 
      });
    }

    // Create OAuth URL
    const redirectUri = `${frontendUrl}/auth/facebook/callback`;
    const scope = 'pages_read_engagement,pages_show_list,ads_read,ads_management,business_management';
    const state = req.query.state as string || 'default'; // Optional state for CSRF protection
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code` +
      `&state=${state}`;

    res.json({ authUrl, redirectUri });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Handle Facebook OAuth callback
export const handleFacebookCallback = async (req: Request, res: Response) => {
  try {
    const { code, error, error_reason, error_description } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';

    if (error) {
      return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error_description as string || error as string)}`);
    }

    if (!code) {
      return res.redirect(`${frontendUrl}/?error=${encodeURIComponent('Không nhận được authorization code từ Facebook')}`);
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${frontendUrl}/auth/facebook/callback`;

    if (!appId || !appSecret) {
      return res.redirect(`${frontendUrl}/?error=${encodeURIComponent('Facebook App ID hoặc Secret chưa được cấu hình')}`);
    }

    // Exchange code for access token
    try {
      const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code: code,
        },
      });

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        return res.redirect(`${frontendUrl}/?error=${encodeURIComponent('Không thể lấy access token từ Facebook')}`);
      }

      // Redirect to frontend with access token
      // In production, you should use a more secure method (e.g., session, JWT)
      return res.redirect(`${frontendUrl}/?access_token=${access_token}&source=facebook_login`);
    } catch (tokenError: any) {
      const errorMsg = tokenError.response?.data?.error?.message || tokenError.message || 'Lỗi khi trao đổi code lấy access token';
      return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(errorMsg)}`);
    }
  } catch (error: any) {
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error.message)}`);
  }
};

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

export const getAdAccounts = async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.query;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access Token là bắt buộc' });
    }

    // Get ad accounts directly from user token
    const adAccounts = await facebookAPI.getAdAccounts(accessToken as string);
    res.json(adAccounts);
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

