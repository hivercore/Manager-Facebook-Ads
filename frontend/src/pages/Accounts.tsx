import { useEffect, useState } from 'react'
import { Users, Plus, MoreVertical, CheckCircle, XCircle, Trash2, RefreshCw, AlertTriangle, DollarSign, TrendingUp, CreditCard, Clock } from 'lucide-react'
import { api } from '../services/api'
import AddAccountModal from '../components/AddAccountModal'
import { facebookAuth } from '../services/facebookAuth'
import { checkSpendLimit } from '../services/telegramNotification'

interface Account {
  id: string
  name: string
  accountStatus: number
  accountStatusRaw?: number
  disableReason?: string
  statusMessage?: string
  currency: string
  timezoneName: string
  balance: string
  spend: string // Total spend (all time)
  fundingSource?: any
  isPrepayAccount?: boolean
  spendCap?: string // Spending limit
  amountOwed?: string // Amount owed
  amountNeeded?: string // Amount needed to top up
  insights?: {
    spend: string
    impressions: string
    clicks: string
    ctr: string
    cpm: string
    reach: string
  } | null
  storedId?: string
  error?: string
  tokenExpired?: boolean
  tokenExpiresAt?: number
}

const Accounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingTokenId, setUpdatingTokenId] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  })
  const [datePreset, setDatePreset] = useState<string>('today')
  const [refreshInterval, setRefreshInterval] = useState<number>(30000) // Start with 30 seconds
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  const [rateLimitError, setRateLimitError] = useState<boolean>(false)
  const [isManualRefresh, setIsManualRefresh] = useState<boolean>(false)
  const [isFetching, setIsFetching] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      if (!isFetching) {
        await fetchAccounts()
      }
    }
    
    loadData()
    
    // Smart polling with adaptive interval
    const interval = setInterval(() => {
      // Only auto-refresh if not manually refreshing, not in rate limit, and not currently fetching
      if (mounted && !isManualRefresh && !rateLimitError && !isFetching) {
        fetchAccounts()
      }
    }, refreshInterval)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset, refreshInterval, isManualRefresh, rateLimitError])

  const fetchAccounts = async (isManual = false) => {
    // Prevent duplicate calls
    if (isFetching) {
      return
    }
    
    try {
      setIsFetching(true)
      setIsManualRefresh(isManual)
      // Only show loading spinner on initial load or manual refresh
      if (accounts.length === 0 || isManual) {
        setLoading(true)
      }
      setError(null)
      
      const response = await api.get('/accounts', {
        params: {
          datePreset: datePreset
        }
      })
      const accountsData = response.data || []
      setAccounts(accountsData)
      setLastFetchTime(Date.now())
      
      // Check spend limits and send Telegram notifications if needed
      if (accountsData.length > 0) {
        accountsData.forEach(async (account: Account) => {
          if (account.insights?.spend) {
            const spend = parseFloat(account.insights.spend) || 0
            await checkSpendLimit(account.id, account.name || account.id, spend)
          }
        })
      }
      
      // Reset rate limit error on success
      if (rateLimitError) {
        setRateLimitError(false)
        setRefreshInterval(30000) // Reset to 30 seconds
      }
    } catch (error: any) {
      console.error('Error fetching accounts:', error)
      
      // Check for rate limit errors
      const errorCode = error.response?.data?.errorCode
      const errorMessage = error.response?.data?.error || error.message || ''
      
      if (errorCode === 4 || errorCode === 17 || 
          errorMessage.includes('rate limit') || 
          errorMessage.includes('request limit') ||
          error.response?.status === 429) {
        // Rate limit detected - increase interval exponentially
        setRateLimitError(true)
        setRefreshInterval(prev => Math.min(prev * 2, 300000)) // Max 5 minutes
        setError('Đã đạt giới hạn request. Tự động giảm tần suất cập nhật.')
      } else {
        setError(error.response?.data?.error || 'Không thể tải dữ liệu tài khoản')
      }
    } finally {
      setLoading(false)
      setIsManualRefresh(false)
      setIsFetching(false)
    }
  }

  const handleManualRefresh = () => {
    fetchAccounts(true)
  }

  const handleUpdateToken = async (account: Account) => {
    if (!account.storedId) return

    setUpdatingTokenId(account.storedId)

    try {
      // Login to Facebook to get new token
      await facebookAuth.init()
      const { accessToken } = await facebookAuth.login()
      
      // Update token for this account
      await api.put(`/accounts/${account.storedId}/token`, {
        accessToken: accessToken
      })
      
      // Refresh accounts list
      await fetchAccounts()
      alert('Token đã được cập nhật thành công!')
    } catch (error: any) {
      console.error('Error updating token:', error)
      alert(error.response?.data?.error || error.message || 'Có lỗi xảy ra khi cập nhật token')
    } finally {
      setUpdatingTokenId(null)
    }
  }

  const handleDeleteAccount = async (account: Account) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${account.name}"?`)) {
      return
    }

    const idToDelete = account.storedId || account.id
    setDeletingId(idToDelete)

    try {
      await api.delete(`/accounts/${idToDelete}`)
      await fetchAccounts()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra khi xóa tài khoản')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRefreshToken = async (account: Account) => {
    if (!account.storedId) return

    setUpdatingTokenId(account.storedId)

    try {
      const response = await api.post(`/accounts/${account.storedId}/refresh-token`)
      await fetchAccounts()
      const expiresAt = response.data.expiresAtFormatted || response.data.expiresAt
      alert(`Token đã được refresh thành công!${expiresAt ? `\nHết hạn: ${expiresAt}` : ''}`)
    } catch (error: any) {
      console.error('Error refreshing token:', error)
      alert(error.response?.data?.error || error.message || 'Có lỗi xảy ra khi refresh token')
    } finally {
      setUpdatingTokenId(null)
    }
  }

  const formatExpiresAt = (expiresAt?: number) => {
    if (!expiresAt) return 'Không xác định'
    const date = new Date(expiresAt)
    const now = Date.now()
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
    
    if (daysLeft < 0) return 'Đã hết hạn'
    if (daysLeft < 7) return `Còn ${daysLeft} ngày (${date.toLocaleDateString('vi-VN')})`
    return date.toLocaleDateString('vi-VN')
  }

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const sortedAccounts = [...accounts].sort((a, b) => {
    const { key, direction } = sortConfig
    const getVal = (acc: Account) => {
      switch (key) {
        case 'name':
          return acc.name?.toLowerCase() || ''
        case 'balance':
          return parseFloat(acc.balance || '0')
        case 'spend':
          return parseFloat(acc.spend || '0')
        case 'insightsSpend':
          return acc.insights ? parseFloat(acc.insights.spend || '0') : 0
        case 'currency':
          return acc.currency || ''
        default:
          return ''
      }
    }
    const aVal = getVal(a)
    const bVal = getVal(b)
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(parseFloat(amount))
  }

  // Calculate total spent today
  const calculateTotalSpentToday = () => {
    if (datePreset !== 'today') return 0
    return sortedAccounts.reduce((total, account) => {
      const spend = account.insights?.spend ? parseFloat(account.insights.spend) : 0
      return total + spend
    }, 0)
  }

  // Check if account exceeds limit
  const isExceedingLimit = (account: Account) => {
    if (!account.spendCap || parseFloat(account.spendCap) === 0) return false
    const totalSpend = parseFloat(account.spend || '0')
    return totalSpend >= parseFloat(account.spendCap)
  }

  // Calculate total amount needed to pay for accounts with zero or negative balance
  const calculateTotalAmountNeeded = () => {
    return sortedAccounts.reduce((total, account) => {
      const balance = parseFloat(account.balance || '0')
      const amountNeeded = parseFloat(account.amountNeeded || '0')
      // Include accounts with negative balance or positive amountNeeded
      if (balance <= 0 || amountNeeded > 0) {
        // Use amountNeeded if available, otherwise use absolute value of negative balance
        const needed = amountNeeded > 0 ? amountNeeded : Math.abs(balance)
        return total + needed
      }
      return total
    }, 0)
  }

  const getStatusBadge = (account: Account) => {
    const status = account.accountStatus;
    const statusMessage = account.statusMessage;
    
    // Status codes from Facebook:
    // 1 = ACTIVE
    // 2 = DISABLED
    // 3 = UNSETTLED / PENDING_SETTLEMENT
    // 7 = PENDING_RISK_REVIEW
    // 8 = IN_GRACE_PERIOD (quá hạn thanh toán)
    // 9 = PENDING_SETTLEMENT
    // 100 = PENDING_CLOSURE
    // 0 = Custom status (hết số dư)
    
    if (status === 1) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={12} className="mr-1" />
          Hoạt động
        </span>
      )
    } else if (status === 8) {
      // In grace period - quá hạn thanh toán
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle size={12} className="mr-1" />
          {statusMessage || 'Quá hạn thanh toán'}
        </span>
      )
    } else if (status === 2) {
      // Disabled
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle size={12} className="mr-1" />
          {statusMessage || 'Đã vô hiệu hóa'}
        </span>
      )
    } else if (status === 3 || status === 9) {
      // Unsettled or pending settlement
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <XCircle size={12} className="mr-1" />
          {statusMessage || 'Chưa thanh toán'}
        </span>
      )
    } else if (status === 0) {
      // Custom: No balance
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <XCircle size={12} className="mr-1" />
          {statusMessage || 'Hết số dư'}
        </span>
      )
    } else {
      // Other statuses
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle size={12} className="mr-1" />
          {statusMessage || 'Không xác định'}
        </span>
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AddAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAccounts}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tài khoản Quảng cáo</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Quản lý các tài khoản quảng cáo Facebook của bạn</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm w-full sm:w-auto bg-white"
          >
            <option value="today">Hôm nay</option>
            <option value="yesterday">Hôm qua</option>
            <option value="last_7d">7 ngày qua</option>
            <option value="last_14d">14 ngày qua</option>
            <option value="last_28d">28 ngày qua</option>
            <option value="last_30d">30 ngày qua</option>
            <option value="last_90d">90 ngày qua</option>
            <option value="this_month">Tháng này</option>
            <option value="last_month">Tháng trước</option>
            <option value="this_quarter">Quý này</option>
            <option value="lifetime">Tất cả thời gian</option>
          </select>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus size={20} />
            <span>Thêm tài khoản</span>
          </button>
        </div>
      </div>

      {/* Rate Limit Warning */}
      {rateLimitError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Đã đạt giới hạn request</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Hệ thống đã tự động giảm tần suất cập nhật để tránh vượt quá giới hạn của Facebook API. 
                Dữ liệu sẽ được cập nhật mỗi {Math.floor(refreshInterval / 1000)} giây.
              </p>
              <button
                onClick={handleManualRefresh}
                className="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900"
              >
                Làm mới ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Last Update Info */}
      {lastFetchTime > 0 && !rateLimitError && (
        <div className="text-xs text-gray-500 flex items-center space-x-1">
          <Clock size={12} />
          <span>
            Cập nhật lần cuối: {new Date(lastFetchTime).toLocaleTimeString('vi-VN')} 
            (Tự động cập nhật mỗi {Math.floor(refreshInterval / 1000)} giây)
          </span>
        </div>
      )}

      {/* Total Spent Today Summary */}
      {datePreset === 'today' && sortedAccounts.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-blue-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Tổng số tiền tiêu hôm nay</h3>
                <p className="text-xs text-blue-700 mt-1">Tổng chi tiêu của tất cả tài khoản</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(calculateTotalSpentToday().toString())}
            </div>
          </div>
        </div>
      )}

      {/* Total Amount Needed to Pay Summary */}
      {calculateTotalAmountNeeded() > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="h-5 w-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Tổng số tiền cần thanh toán</h3>
                <p className="text-xs text-red-700 mt-1">
                  Tổng số tiền cần nạp cho các tài khoản hết số dư
                </p>
              </div>
            </div>
            <div className="text-2xl font-bold text-red-900">
              {formatCurrency(calculateTotalAmountNeeded().toString())}
            </div>
          </div>
        </div>
      )}

      {/* Warning Alerts */}
      {sortedAccounts.some(acc => 
        parseFloat(acc.amountNeeded || '0') > 0 || 
        acc.accountStatus === 8 || 
        acc.accountStatus === 2 ||
        acc.tokenExpired ||
        parseFloat(acc.balance || '0') < 0
      ) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Cảnh báo tài khoản</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {sortedAccounts.filter(acc => parseFloat(acc.amountNeeded || '0') > 0).map(acc => (
                    <li key={acc.id}>
                      <strong>{acc.name}</strong>: Cần nạp {formatCurrency(acc.amountNeeded)} để tiếp tục quảng cáo
                    </li>
                  ))}
                  {sortedAccounts.filter(acc => acc.accountStatus === 8).map(acc => (
                    <li key={acc.id}>
                      <strong>{acc.name}</strong>: {acc.statusMessage || 'Quá hạn thanh toán'}
                    </li>
                  ))}
                  {sortedAccounts.filter(acc => acc.tokenExpired).map(acc => (
                    <li key={acc.id}>
                      <strong>{acc.name}</strong>: Token đã hết hạn, cần cập nhật
                    </li>
                  ))}
                  {sortedAccounts.filter(acc => parseFloat(acc.balance || '0') < 0).map(acc => (
                    <li key={acc.id}>
                      <strong>{acc.name}</strong>: Số dư âm ({formatCurrency(acc.balance)})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { label: 'Tài khoản', key: 'name', align: 'left' },
                  { label: 'Trạng thái', key: 'status', align: 'left', sortable: false },
                  { label: 'Số dư', key: 'balance', align: 'left' },
                  { label: 'Cần nạp', key: 'amountNeeded', align: 'left' },
                  { label: 'Hạn mức', key: 'spendCap', align: 'left' },
                  { label: `Chi tiêu (${datePreset === 'today' ? 'Hôm nay' : datePreset === 'yesterday' ? 'Hôm qua' : datePreset === 'last_7d' ? '7 ngày' : datePreset === 'last_30d' ? '30 ngày' : datePreset === 'lifetime' ? 'Tất cả' : datePreset})`, key: 'insightsSpend', align: 'left' },
                  { label: 'Tổng chi tiêu', key: 'spend', align: 'left' },
                  { label: 'Hành động', key: 'actions', align: 'right', sortable: false },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={`px-4 lg:px-6 py-3 text-${col.align} text-xs font-medium text-gray-500 uppercase tracking-wider`}
                  >
                    <button
                      type="button"
                      className={`flex items-center ${col.align === 'right' ? 'justify-end' : 'justify-start'} space-x-1 ${col.sortable === false ? 'cursor-default' : 'hover:text-primary-600'}`}
                      onClick={col.sortable === false ? undefined : () => handleSort(col.key)}
                    >
                      <span>{col.label}</span>
                      {col.sortable === false ? null : sortConfig.key === col.key ? (
                        <span className="text-[10px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-[10px] text-gray-300">▲</span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Không có tài khoản</h3>
                    <p className="mt-1 text-sm text-gray-500">Bắt đầu bằng cách thêm tài khoản quảng cáo đầu tiên của bạn.</p>
                  </td>
                </tr>
              ) : (
                sortedAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-primary-100">
                          <Users className="h-6 w-6 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{account.name}</div>
                          <div className="text-xs sm:text-sm text-gray-500 truncate max-w-[200px]">{account.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {account.tokenExpired ? (
                        <div className="flex flex-col gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <XCircle size={12} className="mr-1" />
                            Token đã hết hạn
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(account)}
                          {account.tokenExpiresAt && (
                            <div className="text-xs text-gray-500">
                              Token: {formatExpiresAt(account.tokenExpiresAt)}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(account.balance)}
                      </div>
                      {parseFloat(account.balance || '0') < 0 && (
                        <div className="text-xs text-red-600 mt-1 flex items-center">
                          <AlertTriangle size={12} className="mr-1" />
                          Số dư âm
                        </div>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {parseFloat(account.amountNeeded || '0') > 0 ? (
                        <div className="flex items-center">
                          <div className="text-sm font-semibold text-orange-600">
                            {formatCurrency(account.amountNeeded)}
                          </div>
                          <AlertTriangle size={14} className="ml-1 text-orange-600" />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {parseFloat(account.spendCap || '0') > 0 ? (
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(account.spendCap)}
                          </div>
                          {account.spend && parseFloat(account.spend) > 0 && (() => {
                            const remaining = parseFloat(account.spendCap) - parseFloat(account.spend);
                            const isExceeded = isExceedingLimit(account);
                            return (
                              <>
                                <div className={`text-xs mt-1 ${isExceeded ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                  {isExceeded ? (
                                    <>
                                      <AlertTriangle size={12} className="inline mr-1" />
                                      Đã vượt: {formatCurrency(Math.abs(remaining).toString())}
                                    </>
                                  ) : (
                                    `Còn lại: ${formatCurrency(remaining.toString())}`
                                  )}
                                </div>
                                {isExceeded && (
                                  <div className="text-xs text-red-600 font-semibold mt-1">
                                    Tổng tiền: {formatCurrency(account.spend)}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Không giới hạn</span>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {account.insights ? (
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(parseFloat(account.insights.spend))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Intl.NumberFormat('vi-VN').format(parseInt(account.insights.impressions))} hiển thị
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(account.spend)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {account.tokenExpired && account.storedId && (
                          <>
                            <button
                              onClick={() => handleUpdateToken(account)}
                              disabled={updatingTokenId === account.storedId}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Cập nhật token (đăng nhập lại)"
                            >
                              {updatingTokenId === account.storedId ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                              ) : (
                                <RefreshCw size={18} />
                              )}
                            </button>
                            <button
                              onClick={() => handleRefreshToken(account)}
                              disabled={updatingTokenId === account.storedId}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Refresh token (cần App ID và App Secret)"
                            >
                              <RefreshCw size={18} />
                            </button>
                          </>
                        )}
                        {!account.tokenExpired && account.storedId && (
                          <button
                            onClick={() => handleRefreshToken(account)}
                            disabled={updatingTokenId === account.storedId}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Refresh token để kéo dài thời gian hết hạn"
                          >
                            {updatingTokenId === account.storedId ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : (
                              <RefreshCw size={18} />
                            )}
                          </button>
                        )}
                        {account.error && !account.tokenExpired && (
                          <span className="text-xs text-red-600 mr-2">Lỗi kết nối</span>
                        )}
                        <button
                          onClick={() => handleDeleteAccount(account)}
                          disabled={deletingId === (account.storedId || account.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Xóa tài khoản"
                        >
                          {deletingId === (account.storedId || account.id) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Accounts

