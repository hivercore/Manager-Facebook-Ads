import { useState, FormEvent, useEffect } from 'react'
import { X, Loader2, AlertCircle, CheckCircle, Facebook, Key, ChevronRight } from 'lucide-react'
import { facebookAuth, FacebookPage } from '../services/facebookAuth'
import { api } from '../services/api'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type TabType = 'login' | 'manual'
type StepType = 'login' | 'selectPage' | 'selectAccount' | 'loading'

const AddAccountModal = ({ isOpen, onClose, onSuccess }: AddAccountModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('login')
  const [step, setStep] = useState<StepType>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Facebook login state
  const [userAccessToken, setUserAccessToken] = useState<string | null>(null)
  const [pages, setPages] = useState<FacebookPage[]>([])
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null)
  const [adAccounts, setAdAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null)

  // Manual form state
  const [formData, setFormData] = useState({
    accountId: '',
    accessToken: '',
    name: '',
  })

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setStep('login')
      setActiveTab('login')
      setUserAccessToken(null)
      setPages([])
      setSelectedPage(null)
      setAdAccounts([])
      setSelectedAccount(null)
      setFormData({ accountId: '', accessToken: '', name: '' })
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  // Handle Facebook Login via OAuth (no App ID needed on frontend)
  const handleFacebookLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get Facebook OAuth URL from backend
      const response = await api.get('/auth/facebook/login-url')
      const { authUrl } = response.data

      if (!authUrl) {
        throw new Error('Không thể lấy Facebook login URL từ server')
      }

      // Store that we're expecting a callback
      sessionStorage.setItem('facebook_login_pending', 'true')
      
      // Redirect to Facebook OAuth
      window.location.href = authUrl
    } catch (err: any) {
      console.error('Facebook login error:', err)
      let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.'
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc liên hệ quản trị viên.'
      }
      
      setError(errorMessage)
      setLoading(false)
    }
  }

  // Handle OAuth callback - check if we have access token in URL
  useEffect(() => {
    if (isOpen && activeTab === 'login' && step === 'login') {
      const urlParams = new URLSearchParams(window.location.search)
      const accessToken = urlParams.get('access_token')
      const error = urlParams.get('error')
      const source = urlParams.get('source')

      if (source === 'facebook_login') {
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)

        if (error) {
          setError(decodeURIComponent(error))
          return
        }

        if (accessToken) {
          // We have access token, continue with getting pages
          handleOAuthSuccess(accessToken)
        }
      }
    }
  }, [isOpen, activeTab, step])

  // Handle successful OAuth login
  const handleOAuthSuccess = async (accessToken: string) => {
    setLoading(true)
    setError(null)
    setUserAccessToken(accessToken)

    try {
      // Get pages using backend API
      const response = await api.get('/auth/pages', {
        params: { accessToken }
      })
      const userPages = response.data

      if (!userPages || userPages.length === 0) {
        setError('Bạn chưa có page nào. Vui lòng tạo page trước.')
        setLoading(false)
        return
      }

      setPages(userPages)
      setStep('selectPage')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Không thể lấy danh sách pages')
    } finally {
      setLoading(false)
    }
  }

  // Handle page selection
  const handleSelectPage = async (page: FacebookPage) => {
    setLoading(true)
    setError(null)
    setSelectedPage(page)

    try {
      // Get ad accounts directly from user access token (no need for page ID)
      const response = await api.get('/auth/adaccounts', {
        params: { 
          accessToken: userAccessToken
        }
      })
      const accounts = response.data

      if (!accounts || accounts.length === 0) {
        setError('Bạn chưa có tài khoản quảng cáo nào.')
        setLoading(false)
        return
      }

      setAdAccounts(accounts)
      setStep('selectAccount')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Không thể lấy danh sách tài khoản quảng cáo.')
    } finally {
      setLoading(false)
    }
  }

  // Handle account selection and add to system
  const handleSelectAccount = async (account: any) => {
    setLoading(true)
    setError(null)
    setSelectedAccount(account)
    setStep('loading')

    try {
      // Add account using user access token (has ads_management permission)
      // Backend will automatically exchange to long-lived token if App ID and Secret are configured
      await api.post('/accounts', {
        accountId: account.id,
        accessToken: userAccessToken, // Use user token - backend will handle token exchange
        name: account.name || selectedPage?.name || account.id,
      })

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 1500)
    } catch (err: any) {
      // Handle error response
      let errorMsg = 'Có lỗi xảy ra khi thêm tài khoản'
      
      if (err.response?.data) {
        const errorData = err.response.data
        errorMsg = errorData.error || errorMsg
        
        if (errorData.details) {
          errorMsg += `\n\nChi tiết: ${errorData.details}`
        }
        if (errorData.suggestion) {
          errorMsg += `\n\nGợi ý: ${errorData.suggestion}`
        }
      } else if (err.message) {
        errorMsg = err.message
      }
      
      setError(errorMsg)
      setStep('selectAccount')
    } finally {
      setLoading(false)
    }
  }

  // Handle manual form submit
  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await api.post('/accounts', {
        accountId: formData.accountId.trim(),
        accessToken: formData.accessToken.trim(),
        name: formData.name.trim() || undefined,
      })

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 1500)
    } catch (err: any) {
      // Handle error response
      let errorMsg = 'Có lỗi xảy ra khi thêm tài khoản'
      
      if (err.response?.data) {
        const errorData = err.response.data
        errorMsg = errorData.error || errorMsg
        
        if (errorData.details) {
          errorMsg += `\n\nChi tiết: ${errorData.details}`
        }
        if (errorData.suggestion) {
          errorMsg += `\n\nGợi ý: ${errorData.suggestion}`
        }
      } else if (err.message) {
        errorMsg = err.message
      }
      
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Thêm Tài khoản Quảng cáo
              </h3>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-500 focus:outline-none disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mb-6 border-b border-gray-200">
              <button
                onClick={() => {
                  setActiveTab('login')
                  setStep('login')
                  setError(null)
                }}
                className={`flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                  activeTab === 'login'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Facebook size={18} />
                  <span>Đăng nhập Facebook</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('manual')
                  setError(null)
                }}
                className={`flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                  activeTab === 'manual'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Key size={18} />
                  <span>Nhập thủ công</span>
                </div>
              </button>
            </div>

            {/* Facebook Login Flow */}
            {activeTab === 'login' && (
              <div className="space-y-4">
                {step === 'login' && (
                  <div className="text-center py-8">
                    <Facebook className="mx-auto h-16 w-16 text-primary-600 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Đăng nhập với Facebook
                    </h4>
                    <p className="text-sm text-gray-600 mb-6">
                      Đăng nhập để chọn page và tài khoản quảng cáo của bạn
                    </p>
                    <button
                      onClick={handleFacebookLogin}
                      disabled={loading}
                      className="px-6 py-3 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2] disabled:opacity-50 flex items-center space-x-2 mx-auto"
                    >
                      {loading && <Loader2 size={20} className="animate-spin" />}
                      <Facebook size={20} />
                      <span>Đăng nhập với Facebook</span>
                    </button>
                  </div>
                )}

                {step === 'selectPage' && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                      Chọn Page của bạn
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {pages.map((page) => (
                        <button
                          key={page.id}
                          onClick={() => handleSelectPage(page)}
                          disabled={loading}
                          className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {page.picture?.data?.url ? (
                                <img
                                  src={page.picture.data.url}
                                  alt={page.name}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <Facebook className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{page.name}</p>
                                {page.category && (
                                  <p className="text-xs text-gray-500">{page.category}</p>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 'selectAccount' && (
                  <div>
                    <button
                      onClick={() => {
                        setStep('selectPage')
                        setAdAccounts([])
                        setSelectedAccount(null)
                      }}
                      className="text-sm text-primary-600 hover:text-primary-700 mb-4"
                    >
                      ← Quay lại chọn page
                    </button>
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                      Chọn Tài khoản Quảng cáo
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {adAccounts.map((account) => (
                        <button
                          key={account.id}
                          onClick={() => handleSelectAccount(account)}
                          disabled={loading}
                          className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{account.name || account.id}</p>
                              <p className="text-xs text-gray-500 mt-1">ID: {account.id}</p>
                              {account.currency && (
                                <p className="text-xs text-gray-500">Tiền tệ: {account.currency}</p>
                              )}
                            </div>
                            <ChevronRight className="text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 'loading' && (
                  <div className="text-center py-8">
                    <Loader2 className="mx-auto h-12 w-12 text-primary-600 animate-spin mb-4" />
                    <p className="text-gray-600">Đang thêm tài khoản...</p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Form */}
            {activeTab === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-1">
                    Account ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="accountId"
                    required
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    placeholder="act_123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ID tài khoản quảng cáo Facebook (bắt đầu bằng "act_")
                  </p>
                </div>

                <div>
                  <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="accessToken"
                    required
                    rows={3}
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    placeholder="Nhập Access Token từ Facebook"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Access Token có quyền ads_read và ads_management
                  </p>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Tên tài khoản (tùy chọn)
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tên hiển thị cho tài khoản"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Nếu để trống, hệ thống sẽ lấy tên từ Facebook
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    <span>{loading ? 'Đang thêm...' : 'Thêm tài khoản'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-4 flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="mt-4 flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-600">Tài khoản đã được thêm thành công!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddAccountModal
