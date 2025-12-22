import { Request, Response } from 'express';
import { FacebookAPI } from '../services/facebookAPI';
import axios from 'axios';

const facebookAPI = new FacebookAPI();

// Get Facebook OAuth login URL
export const getFacebookLoginUrl = async (req: Request, res: Response) => {
  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
    
    // Get backend URL from request or env
    const backendUrl = process.env.BACKEND_URL || 
      `${req.protocol}://${req.get('host')}` || 
      'http://localhost:3001';
    
    if (!appId) {
      return res.status(500).json({ 
        error: 'Facebook App ID chưa được cấu hình trên server. Vui lòng liên hệ quản trị viên.' 
      });
    }

    // Create OAuth URL - callback must be backend URL
    const redirectUri = `${backendUrl}/api/auth/facebook/callback`;
    // Request permissions for pages and ad accounts
    // pages_show_list: List all pages user manages
    // pages_read_engagement: Read page insights
    // ads_read: Read ad accounts
    // ads_management: Manage ads
    // business_management: Access Business Manager (for managed pages)
    const scope = 'pages_read_engagement,pages_show_list,ads_read,ads_management,business_management';
    const state = req.query.state as string || 'default'; // Optional state for CSRF protection
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code` +
      `&state=${state}`;

    res.json({ authUrl, redirectUri, frontendUrl });
  } catch (error: any) {
    console.error('Error getting Facebook login URL:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi tạo Facebook login URL' });
  }
};

// Handle Facebook OAuth callback
export const handleFacebookCallback = async (req: Request, res: Response) => {
  try {
    const { code, error, error_reason, error_description } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';

    if (error) {
      console.error('Facebook OAuth error:', error, error_reason, error_description);
      return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error_description as string || error as string)}&source=facebook_login`);
    }

    if (!code) {
      console.error('No authorization code received from Facebook');
      return res.redirect(`${frontendUrl}/?error=${encodeURIComponent('Không nhận được authorization code từ Facebook')}&source=facebook_login`);
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    
    // Get backend URL - must match the redirect_uri used in getFacebookLoginUrl
    const backendUrl = process.env.BACKEND_URL || 
      `${req.protocol}://${req.get('host')}` || 
      'http://localhost:3001';
    const redirectUri = `${backendUrl}/api/auth/facebook/callback`;

    if (!appId || !appSecret) {
      console.error('Facebook App ID or Secret not configured');
      return res.redirect(`${frontendUrl}/?error=${encodeURIComponent('Facebook App ID hoặc Secret chưa được cấu hình')}&source=facebook_login`);
    }

    // Exchange code for access token
    try {
      console.log('Exchanging code for access token...');
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
        console.error('No access token in response:', tokenResponse.data);
        return res.redirect(`${frontendUrl}/?error=${encodeURIComponent('Không thể lấy access token từ Facebook')}&source=facebook_login`);
      }

      console.log('Successfully obtained access token');
      // Redirect to frontend with access token
      // In production, you should use a more secure method (e.g., session, JWT)
      return res.redirect(`${frontendUrl}/?access_token=${access_token}&source=facebook_login`);
    } catch (tokenError: any) {
      console.error('Token exchange error:', tokenError.response?.data || tokenError.message);
      const errorMsg = tokenError.response?.data?.error?.message || tokenError.message || 'Lỗi khi trao đổi code lấy access token';
      return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(errorMsg)}&source=facebook_login`);
    }
  } catch (error: any) {
    console.error('Callback handler error:', error);
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error.message || 'Lỗi không xác định')}&source=facebook_login`);
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

