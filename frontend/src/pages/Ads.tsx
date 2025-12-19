import { useEffect, useState } from 'react'
import { TrendingUp, Plus, Play, Pause, MoreVertical, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { api } from '../services/api'
import AccountSelector from '../components/AccountSelector'

interface Ad {
  id: string
  name: string
  status: string
  campaign_id?: string
  adset_id?: string
  impressions: number
  clicks: number
  spend: number
}

const Ads = () => {
  const [ads, setAds] = useState<Ad[]>([])
  const [filteredAds, setFilteredAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<string>('today')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  })

  useEffect(() => {
    if (selectedAccountId) {
      fetchAds()
    } else {
      setAds([])
      setFilteredAds([])
      setLoading(false)
    }
  }, [selectedAccountId, datePreset])

  useEffect(() => {
    sortAds()
  }, [ads, sortConfig])

  const fetchAds = async () => {
    if (!selectedAccountId) return

    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/ads', {
        params: { 
          accountId: selectedAccountId,
          datePreset: datePreset
        }
      })
      setAds(response.data || [])
      setFilteredAds(response.data || [])
    } catch (err: any) {
      console.error('Error fetching ads:', err)
      setError(err.response?.data?.error || 'Không thể tải danh sách quảng cáo')
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đang chạy' },
      PAUSED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Tạm dừng' },
      ARCHIVED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Đã lưu trữ' },
      DISAPPROVED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Bị từ chối' },
      PENDING_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Đang xem xét' },
    }

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0.00'
    return ((clicks / impressions) * 100).toFixed(2)
  }

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const sortAds = () => {
    const sorted = [...ads].sort((a, b) => {
      const { key, direction } = sortConfig
      let aValue: any = a[key as keyof Ad]
      let bValue: any = b[key as keyof Ad]

      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      // Handle string values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' 
          ? aValue.localeCompare(bValue, 'vi')
          : bValue.localeCompare(aValue, 'vi')
      }

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return direction === 'asc' ? 1 : -1
      if (bValue == null) return direction === 'asc' ? -1 : 1

      // Convert to string for comparison
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      return direction === 'asc' 
        ? aStr.localeCompare(bStr, 'vi')
        : bStr.localeCompare(aStr, 'vi')
    })

    setFilteredAds(sorted)
  }

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="text-gray-400" />
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-primary-600" />
      : <ArrowDown size={14} className="text-primary-600" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quảng cáo</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Quản lý các quảng cáo của bạn</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <AccountSelector
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            showAllOption={false}
          />
          {selectedAccountId && (
            <>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                title="Chọn khoảng thời gian"
              >
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="last_7d">7 ngày qua</option>
                <option value="last_14d">14 ngày qua</option>
                <option value="last_28d">28 ngày qua</option>
                <option value="last_30d">30 ngày qua</option>
                <option value="this_month">Tháng này</option>
                <option value="last_month">Tháng trước</option>
              </select>
              <button
                onClick={fetchAds}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Làm mới"
              >
                <RefreshCw size={20} />
              </button>
            </>
          )}
          <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm sm:text-base">
            <Plus size={20} />
            <span className="hidden sm:inline">Tạo quảng cáo</span>
            <span className="sm:hidden">Tạo</span>
          </button>
        </div>
      </div>

      {!selectedAccountId ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Chọn tài khoản</h3>
          <p className="mt-1 text-sm text-gray-500">Vui lòng chọn tài khoản để xem quảng cáo.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      ) : ads.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Không có quảng cáo</h3>
          <p className="mt-1 text-sm text-gray-500">Tài khoản này chưa có quảng cáo nào.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                      >
                        <span>Quảng cáo</span>
                        {getSortIcon('name')}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                      >
                        <span>Trạng thái</span>
                        {getSortIcon('status')}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('impressions')}
                        className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                      >
                        <span>Lượt hiển thị</span>
                        {getSortIcon('impressions')}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('clicks')}
                        className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                      >
                        <span>Lượt nhấp</span>
                        {getSortIcon('clicks')}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CTR
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('spend')}
                        className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                      >
                        <span>Đã chi tiêu</span>
                        {getSortIcon('spend')}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAds.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Không có quảng cáo</h3>
                        <p className="mt-1 text-sm text-gray-500">Tài khoản này chưa có quảng cáo nào.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAds.map((ad) => (
                    <tr key={ad.id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-primary-100">
                            <TrendingUp className="h-6 w-6 text-primary-600" />
                          </div>
                          <div className="ml-4 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{ad.name}</div>
                            {ad.campaign_id && (
                              <div className="text-xs sm:text-sm text-gray-500 truncate">Campaign: {ad.campaign_id}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(ad.status)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(ad.impressions)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(ad.clicks)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {calculateCTR(ad.clicks, ad.impressions)}%
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(ad.spend)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {ad.status === 'ACTIVE' ? (
                            <button className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Tạm dừng">
                              <Pause size={18} />
                            </button>
                          ) : (
                            <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Kích hoạt">
                              <Play size={18} />
                            </button>
                          )}
                          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Tùy chọn">
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

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
          {filteredAds.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Không có quảng cáo</h3>
              <p className="mt-1 text-sm text-gray-500">Tài khoản này chưa có quảng cáo nào.</p>
            </div>
          ) : (
            filteredAds.map((ad) => (
            <div key={ad.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center flex-1 min-w-0">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-primary-100">
                    <TrendingUp className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{ad.name}</div>
                    {ad.campaign_id && (
                      <div className="text-xs text-gray-500 truncate">Campaign: {ad.campaign_id}</div>
                    )}
                  </div>
                </div>
                <div className="ml-2">
                  {getStatusBadge(ad.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Lượt hiển thị</div>
                  <div className="font-medium text-gray-900">{formatNumber(ad.impressions)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Lượt nhấp</div>
                  <div className="font-medium text-gray-900">{formatNumber(ad.clicks)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">CTR</div>
                  <div className="font-medium text-gray-900">{calculateCTR(ad.clicks, ad.impressions)}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Đã chi tiêu</div>
                  <div className="font-semibold text-gray-900">{formatCurrency(ad.spend)}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end space-x-2">
                {ad.status === 'ACTIVE' ? (
                  <button className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Tạm dừng">
                    <Pause size={18} />
                  </button>
                ) : (
                  <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Kích hoạt">
                    <Play size={18} />
                  </button>
                )}
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Tùy chọn">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
            ))
          )}
        </div>
        </>
      )}
    </div>
  )
}

export default Ads
