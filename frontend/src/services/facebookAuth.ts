// Facebook SDK types
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface FacebookUser {
  id: string;
  name: string;
  email?: string;
}

class FacebookAuthService {
  private appId: string;
  private isInitialized: boolean = false;

  constructor() {
    // Lấy App ID từ environment hoặc sử dụng giá trị mặc định
    // Trong production, nên lấy từ backend hoặc env variable
    this.appId = import.meta.env.VITE_FACEBOOK_APP_ID || '';
    
    // Set up fbAsyncInit if not already set
    if (!window.fbAsyncInit) {
      window.fbAsyncInit = () => {
        if (window.FB && this.appId) {
          window.FB.init({
            appId: this.appId,
            cookie: true,
            xfbml: true,
            version: 'v18.0',
          });
          this.isInitialized = true;
        }
      };
    }
  }

  async init(): Promise<void> {
    if (this.isInitialized && window.FB) return;

    if (!this.appId) {
      throw new Error('Facebook App ID chưa được cấu hình. Vui lòng thêm VITE_FACEBOOK_APP_ID vào file .env');
    }

    return new Promise((resolve, reject) => {
      // If SDK is already loaded, initialize immediately
      if (window.FB) {
        if (!this.isInitialized) {
          window.FB.init({
            appId: this.appId,
            cookie: true,
            xfbml: true,
            version: 'v18.0',
          });
          this.isInitialized = true;
        }
        resolve();
        return;
      }

      // Wait for SDK to load
      const checkInterval = setInterval(() => {
        if (window.FB) {
          clearInterval(checkInterval);
          if (!this.isInitialized) {
            window.FB.init({
              appId: this.appId,
              cookie: true,
              xfbml: true,
              version: 'v18.0',
            });
            this.isInitialized = true;
          }
          resolve();
        }
      }, 100);

      setTimeout(() => {
        if (!this.isInitialized) {
          clearInterval(checkInterval);
          reject(new Error('Facebook SDK initialization timeout. Vui lòng kiểm tra kết nối mạng.'));
        }
      }, 10000);
    });
  }

  async login(): Promise<{ accessToken: string; user: FacebookUser }> {
    await this.init();

    return new Promise((resolve, reject) => {
      window.FB.login(
        (response: any) => {
          if (response.authResponse) {
            const accessToken = response.authResponse.accessToken;
            this.getUserInfo(accessToken)
              .then((user) => {
                resolve({ accessToken, user });
              })
              .catch(reject);
          } else {
            reject(new Error('Đăng nhập thất bại. Vui lòng thử lại.'));
          }
        },
        {
          scope: 'pages_read_engagement,pages_show_list,ads_read,ads_management,business_management',
        }
      );
    });
  }

  async getUserInfo(accessToken: string): Promise<FacebookUser> {
    await this.init();

    return new Promise((resolve, reject) => {
      window.FB.api(
        '/me',
        {
          fields: 'id,name,email',
          access_token: accessToken,
        },
        (response: any) => {
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async getPages(accessToken: string): Promise<FacebookPage[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      window.FB.api(
        '/me/accounts',
        {
          access_token: accessToken,
          fields: 'id,name,access_token,category,picture',
        },
        (response: any) => {
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.data || []);
          }
        }
      );
    });
  }

  async getAdAccounts(accessToken: string): Promise<any[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      window.FB.api(
        '/me/adaccounts',
        {
          access_token: accessToken,
          fields: 'id,name,account_status,currency,timezone_name',
        },
        (response: any) => {
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.data || []);
          }
        }
      );
    });
  }

  async logout(): Promise<void> {
    await this.init();

    return new Promise((resolve) => {
      window.FB.logout(() => {
        resolve();
      });
    });
  }

  getLoginStatus(): Promise<any> {
    return new Promise((resolve) => {
      if (!this.isInitialized) {
        this.init().then(() => {
          window.FB.getLoginStatus(resolve);
        });
      } else {
        window.FB.getLoginStatus(resolve);
      }
    });
  }
}

export const facebookAuth = new FacebookAuthService();

