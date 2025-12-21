import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'

// Cache for detected backend URL
const BACKEND_URL_CACHE_KEY = 'detected_backend_url'

// Generate possible backend URLs from frontend URL
const generatePossibleBackendUrls = (): string[] => {
  const currentOrigin = window.location.origin
  const hostname = window.location.hostname
  
  const possibleUrls: string[] = []
  
  // Pattern 1: Remove trailing numbers (manager-facebook-ads-1 -> manager-facebook-ads)
  if (hostname.includes('-') && /\d+$/.test(hostname)) {
    const baseName = hostname.replace(/-\d+$/, '')
    possibleUrls.push(`https://${baseName}.onrender.com`)
  }
  
  // Pattern 2: Replace frontend with backend
  if (hostname.includes('frontend')) {
    possibleUrls.push(hostname.replace('frontend', 'backend'))
    possibleUrls.push(hostname.replace('-frontend', '-backend'))
  }
  
  // Pattern 3: Same domain (if backend is on same domain)
  possibleUrls.push(currentOrigin)
  
  // Pattern 4: Common Render patterns
  if (hostname.includes('onrender.com')) {
    // Try removing service suffix
    const baseName = hostname.split('.')[0]
    if (baseName.includes('-')) {
      const parts = baseName.split('-')
      // Try removing last part (service name)
      if (parts.length > 1) {
        const base = parts.slice(0, -1).join('-')
        possibleUrls.push(`https://${base}.onrender.com`)
      }
    }
  }
  
  // Remove duplicates and invalid URLs
  return [...new Set(possibleUrls)]
    .filter(url => url.startsWith('http'))
    .filter((url, index, self) => self.indexOf(url) === index)
}

// Test if a backend URL is working
const testBackendUrl = async (url: string, timeout: number = 3000): Promise<boolean> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      const data = await response.json()
      return data?.status === 'ok'
    }
    return false
  } catch (error) {
    return false
  }
}

// Auto-detect backend URL by testing multiple possibilities
const detectBackendUrl = async (): Promise<string> => {
  // Check cache first
  const cached = localStorage.getItem(BACKEND_URL_CACHE_KEY)
  if (cached) {
    // Verify cached URL still works
    const isValid = await testBackendUrl(cached, 2000)
    if (isValid) {
      console.log('✅ Using cached backend URL:', cached)
      return cached
    } else {
      // Cache is stale, remove it
      localStorage.removeItem(BACKEND_URL_CACHE_KEY)
    }
  }

  // In development, use relative path (will use Vite proxy)
  if (import.meta.env.DEV) {
    return '/api'
  }

  // Generate possible backend URLs
  const possibleUrls = generatePossibleBackendUrls()
  console.log('🔍 Testing possible backend URLs:', possibleUrls)

  // Test each URL in parallel (with timeout)
  const testPromises = possibleUrls.map(async (url) => {
    const isValid = await testBackendUrl(url, 5000)
    return { url, isValid }
  })

  const results = await Promise.all(testPromises)
  
  // Find first working URL
  const workingUrl = results.find(r => r.isValid)?.url

  if (workingUrl) {
    // Cache the working URL
    localStorage.setItem(BACKEND_URL_CACHE_KEY, workingUrl)
    console.log('✅ Detected working backend URL:', workingUrl)
    return workingUrl
  }

  // Fallback: use first possible URL (will show error if wrong)
  const fallbackUrl = possibleUrls[0] || '/api'
  console.warn('⚠️ Could not detect backend URL, using fallback:', fallbackUrl)
  return fallbackUrl
}

// Initialize API base URL - will be set after detection
let API_BASE_URL = '/api'
let backendUrlPromise: Promise<string> | null = null

// Get or initialize backend URL detection
const ensureBackendUrl = (): Promise<string> => {
  if (backendUrlPromise) {
    return backendUrlPromise
  }

  if (typeof window === 'undefined') {
    // Server-side rendering
    backendUrlPromise = Promise.resolve('/api')
    return backendUrlPromise
  }

  // In development, use relative path
  if (import.meta.env.DEV) {
    API_BASE_URL = '/api'
    backendUrlPromise = Promise.resolve('/api')
    return backendUrlPromise
  }

  // Start detection
  backendUrlPromise = detectBackendUrl().then(url => {
    API_BASE_URL = url
    api.defaults.baseURL = url
    console.log('🔧 API Base URL initialized:', url)
    return url
  }).catch(err => {
    console.error('Failed to detect backend URL:', err)
    return API_BASE_URL
  })

  return backendUrlPromise
}

// Initialize detection on module load (non-blocking)
if (typeof window !== 'undefined' && !import.meta.env.DEV) {
  ensureBackendUrl()
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for sleeping backends
})

// Export function to get current backend URL
export const getBackendUrl = (): string => {
  return api.defaults.baseURL || API_BASE_URL
}

// Export function to ensure backend URL is detected (for components that need it)
export const ensureBackendUrlDetected = (): Promise<string> => {
  return ensureBackendUrl()
}

// Export function to manually set backend URL (for testing)
export const setBackendUrl = (url: string): void => {
  API_BASE_URL = url
  api.defaults.baseURL = url
  localStorage.setItem(BACKEND_URL_CACHE_KEY, url)
  console.log('🔧 Backend URL manually set to:', url)
}

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

