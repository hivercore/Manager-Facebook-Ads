import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'

// Use environment variable for API URL in production, relative path in development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

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

