import axios from 'axios'

// Sử dụng VITE_API_URL trong production, fallback về '/api' trong development
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add access token if available
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('facebook_access_token')
    if (accessToken) {
      config.params = {
        ...config.params,
        accessToken,
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('facebook_access_token')
    }
    
    // Check for token expiration errors
    const errorMessage = error.response?.data?.error || error.message || '';
    if (errorMessage.includes('expired') || errorMessage.includes('Session has expired')) {
      // Token expired - this will be handled by individual components
      console.warn('Access token has expired');
    }
    
    return Promise.reject(error)
  }
)

