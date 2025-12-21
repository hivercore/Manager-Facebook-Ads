import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'

// Auto-detect backend URL if not configured
// Try multiple possible backend URLs
const getBackendUrl = (): string => {
  // If VITE_API_URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // In development, use relative path (will use Vite proxy)
  if (import.meta.env.DEV) {
    return '/api'
  }

  // In production, try to auto-detect from current origin
  // Common Render.com patterns:
  const currentOrigin = window.location.origin
  const possibleBackends = [
    currentOrigin.replace('-1.onrender.com', '.onrender.com'), // manager-facebook-ads-1 -> manager-facebook-ads
    currentOrigin.replace('frontend', 'backend'),
    currentOrigin.replace('-frontend', '-backend'),
    'https://manager-facebook-ads.onrender.com', // Known backend URL
    'https://facebook-ads-manager-backend.onrender.com', // Alternative backend URL
  ]

  // Try the first likely match
  return possibleBackends[0] || '/api'
}

const API_BASE_URL = getBackendUrl()

console.log('API Base URL:', API_BASE_URL)

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add access token if available
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('facebook_access_token')
    if (accessToken && config.params) {
      config.params = {
        ...config.params,
        accessToken,
      }
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Log network errors for debugging
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      console.error('Network Error:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        }
      })
    }

    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('facebook_access_token')
    }
    
    // Check for token expiration errors
    const errorMessage = (error.response?.data as any)?.error || error.message || '';
    if (errorMessage.includes('expired') || errorMessage.includes('Session has expired')) {
      // Token expired - this will be handled by individual components
      console.warn('Access token has expired');
    }
    
    return Promise.reject(error)
  }
)

