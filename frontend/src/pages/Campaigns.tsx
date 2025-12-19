import React, { useEffect, useState } from 'react'
import { Megaphone, Plus, Play, Pause, MoreVertical, RefreshCw, Search, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, ChevronLeft, ShoppingBag, MousePointerClick, MessageCircle, Filter, Users, Eye, Video, Target, TrendingUp, Clock, AlertTriangle, FileText } from 'lucide-react'
import { api } from '../services/api'
import AccountSelector from '../components/AccountSelector'
import CampaignDetailOffcanvas from '../components/CampaignDetailOffcanvas'

interface Campaign {
  id: string
  name: string
  status: string
  effective_status?: string
  objective: string
  daily_budget?: number | string | null
  lifetime_budget?: number | string | null
  created_time?: string
  updated_time?: string
  start_time?: string
  stop_time?: string
  impressions: number
  clicks: number
  spend: number
  reach?: number
  cpm?: number
  cpc?: number
  ctr?: number
  results?: number
  frequency?: number
  messages?: number
}

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>(['ACTIVE'])
  const [datePreset, setDatePreset] = useState<string>('today')
  const [customDateRange, setCustomDateRange] = useState<{
    startDate: string
    startTime: string
    endDate: string
    endTime: string
  } | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7
  const [refreshInterval, setRefreshInterval] = useState<number>(60000) // Start with 60 seconds for campaigns
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  const [rateLimitError, setRateLimitError] = useState<boolean>(false)
  const [isManualRefresh, setIsManualRefresh] = useState<boolean>(false)
  const [isDetailOffcanvasOpen, setIsDetailOffcanvasOpen] = useState<boolean>(false)
  const [selectedCampaignForDetail, setSelectedCampaignForDetail] = useState<Campaign | null>(null)

  useEffect(() => {
    if (selectedAccountId) {
      fetchCampaigns()
    } else {
      setCampaigns([])
      setFilteredCampaigns([])
      setLoading(false)
    }
  }, [selectedAccountId, datePreset, customDateRange])

  // Smart polling for campaigns
  useEffect(() => {
    if (!selectedAccountId || isManualRefresh || rateLimitError) return

    const interval = setInterval(() => {
      fetchCampaigns(false)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [selectedAccountId, datePreset, customDateRange, refreshInterval, isManualRefresh, rateLimitError])

  useEffect(() => {
    filterCampaigns()
    setCurrentPage(1) // Reset to first page when filters change
  }, [campaigns, searchQuery, statusFilter, sortConfig])

  const fetchCampaigns = async (isManual = false) => {
    if (!selectedAccountId) return

    try {
      setIsManualRefresh(isManual)
      setLoading(true)
      setError(null)
      const params: any = {
        accountId: selectedAccountId
      }
      
      // If custom date range is selected, use it; otherwise use date preset
      if (datePreset === 'custom' && customDateRange) {
        params.startDate = customDateRange.startDate
        params.startTime = customDateRange.startTime
        params.endDate = customDateRange.endDate
        params.endTime = customDateRange.endTime
      } else {
        params.datePreset = datePreset
      }
      
      const response = await api.get('/campaigns', { params })
      setCampaigns(response.data || [])
      setLastFetchTime(Date.now())
      
      // Reset rate limit error on success
      if (rateLimitError) {
        setRateLimitError(false)
        setRefreshInterval(60000) // Reset to 60 seconds
      }
    } catch (err: any) {
      console.error('Error fetching campaigns:', err)
      
      // Check for rate limit errors
      const errorCode = err.response?.data?.errorCode
      const errorMessage = err.response?.data?.error || err.message || ''
      
      if (errorCode === 4 || errorCode === 17 || 
          errorMessage.includes('rate limit') || 
          errorMessage.includes('request limit') ||
          err.response?.status === 429) {
        // Rate limit detected - increase interval exponentially
        setRateLimitError(true)
        setRefreshInterval(prev => Math.min(prev * 2, 300000)) // Max 5 minutes
        setError('Đã đạt giới hạn request. Tự động giảm tần suất cập nhật.')
      } else {
        setError(err.response?.data?.error || 'Không thể tải danh sách chiến dịch')
      }
      setCampaigns([])
    } finally {
      setLoading(false)
      setIsManualRefresh(false)
    }
  }

  const handleManualRefresh = () => {
    fetchCampaigns(true)
  }

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const filterCampaigns = () => {
    let filtered = [...campaigns]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (campaign) =>
          campaign.name.toLowerCase().includes(query) ||
          campaign.id.toLowerCase().includes(query) ||
          campaign.objective.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter((campaign) => {
        const displayStatus = campaign.effective_status || campaign.status;
        const campaignStatus = campaign.status;
        
        // Check if status matches directly
        if (statusFilter.includes(displayStatus) || statusFilter.includes(campaignStatus)) {
          return true;
        }
        
        // Handle special cases: CAMPAIGN_PAUSED and ADSET_PAUSED should match PAUSED filter
        if (statusFilter.includes('PAUSED')) {
          if (displayStatus === 'CAMPAIGN_PAUSED' || displayStatus === 'ADSET_PAUSED' || 
              campaignStatus === 'CAMPAIGN_PAUSED' || campaignStatus === 'ADSET_PAUSED') {
            return true;
          }
        }
        
        return false;
      })
    }

    // Sort
    filtered.sort((a, b) => {
      const { key, direction } = sortConfig
      let aValue: any = a[key as keyof Campaign]
      let bValue: any = b[key as keyof Campaign]

      // Handle nested values
      if (key === 'status') {
        aValue = a.effective_status || a.status
        bValue = b.effective_status || b.status
      }

      // Handle CTR calculation
      if (key === 'ctr') {
        aValue = a.ctr !== undefined 
          ? parseFloat(a.ctr.toString())
          : a.impressions > 0 
            ? (a.clicks / a.impressions) * 100
            : 0
        bValue = b.ctr !== undefined 
          ? parseFloat(b.ctr.toString())
          : b.impressions > 0 
            ? (b.clicks / b.impressions) * 100
            : 0
      }

      // Handle CPC calculation
      if (key === 'cpc') {
        aValue = a.cpc !== undefined && a.cpc > 0
          ? a.cpc
          : a.clicks > 0 && a.spend > 0
            ? a.spend / a.clicks
            : 0
        bValue = b.cpc !== undefined && b.cpc > 0
          ? b.cpc
          : b.clicks > 0 && b.spend > 0
            ? b.spend / b.clicks
            : 0
      }

      // Handle Spend Per Order calculation
      if (key === 'spendPerOrder') {
        aValue = a.results && a.results > 0 && a.spend > 0
          ? a.spend / a.results
          : 0
        bValue = b.results && b.results > 0 && b.spend > 0
          ? b.spend / b.results
          : 0
      }

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

    setFilteredCampaigns(filtered)
  }

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="text-gray-400" />
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-primary-600" />
      : <ArrowDown size={14} className="text-primary-600" />
  }

  const toggleRow = (campaignId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId)
      } else {
        newSet.add(campaignId)
      }
      return newSet
    })
  }

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(numAmount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num)
  }

  // Calculate totals for summary row
  const calculateTotals = () => {
    if (filteredCampaigns.length === 0) {
      return {
        impressions: 0,
        clicks: 0,
        spend: 0,
        results: 0,
        messages: 0,
        cpc: 0,
        ctr: 0,
      }
    }

    const totals = filteredCampaigns.reduce((acc, campaign) => {
      acc.impressions += campaign.impressions || 0
      acc.clicks += campaign.clicks || 0
      acc.spend += campaign.spend || 0
      acc.results += campaign.results || 0
      acc.messages += campaign.messages || 0
      return acc
    }, {
      impressions: 0,
      clicks: 0,
      spend: 0,
      results: 0,
      messages: 0,
    })

    // Calculate averages
    totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0

    return totals
  }

  const totals = calculateTotals()

  // Pagination calculations
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const getStatusBadge = (campaign: Campaign) => {
    // Use effective_status if available, otherwise use status
    const displayStatus = campaign.effective_status || campaign.status;
    
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đang chạy' },
      PAUSED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Tạm dừng' },
      ARCHIVED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Đã lưu trữ' },
      DELETED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Đã xóa' },
      DISAPPROVED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Bị từ chối' },
      PREAPPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Đã duyệt' },
      PENDING_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Chờ duyệt' },
      CAMPAIGN_PAUSED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Tạm dừng' },
      ADSET_PAUSED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'AdSet tạm dừng' },
    }

    const config = statusConfig[displayStatus] || { bg: 'bg-gray-100', text: 'text-gray-800', label: displayStatus || campaign.status }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getObjectiveLabel = (objective: string) => {
    const objectives: Record<string, string> = {
      'OUTCOME_TRAFFIC': 'Lưu lượng truy cập',
      'OUTCOME_ENGAGEMENT': 'Tương tác',
      'OUTCOME_LEADS': 'Khách hàng tiềm năng',
      'OUTCOME_APP_PROMOTION': 'Quảng bá ứng dụng',
      'OUTCOME_SALES': 'Bán hàng',
      'OUTCOME_AWARENESS': 'Nhận thức',
      'CONVERSIONS': 'Chuyển đổi',
      'BRAND_AWARENESS': 'Nhận thức thương hiệu',
      'REACH': 'Tiếp cận',
      'LINK_CLICKS': 'Lượt nhấp liên kết',
      'MESSAGES': 'Tin nhắn',
      'LEAD_GENERATION': 'Tạo khách hàng tiềm năng',
      'POST_ENGAGEMENT': 'Tương tác bài viết',
      'PAGE_LIKES': 'Thích trang',
      'VIDEO_VIEWS': 'Lượt xem video',
      'EVENT_RESPONSES': 'Phản hồi sự kiện',
      'STORE_VISITS': 'Lượt ghé thăm cửa hàng',
    }
    return objectives[objective] || objective
  }

  const getObjectiveIcon = (objective: string) => {
    const obj = objective.toUpperCase()
    const iconClass = "h-4 w-4 text-gray-500"
    
    // Map theo icon của Facebook Ads Manager
    if (obj === 'OUTCOME_SALES' || obj === 'CONVERSIONS') {
      // Doanh số - Shopping bag
      return <ShoppingBag className={iconClass} />
    } else if (obj === 'OUTCOME_ENGAGEMENT' || obj === 'POST_ENGAGEMENT' || obj === 'PAGE_LIKES') {
      // Lượt tương tác - Message/Speech bubble
      return <MessageCircle className={iconClass} />
    } else if (obj === 'OUTCOME_LEADS' || obj === 'LEAD_GENERATION') {
      // Khách hàng tiềm năng - Filter/Funnel
      return <Filter className={iconClass} />
    } else if (obj === 'OUTCOME_TRAFFIC' || obj === 'LINK_CLICKS') {
      // Lưu lượng truy cập - Mouse cursor
      return <MousePointerClick className={iconClass} />
    } else if (obj === 'MESSAGES') {
      // Tin nhắn - Message circle
      return <MessageCircle className={iconClass} />
    } else if (obj === 'VIDEO_VIEWS') {
      // Video views - Video icon
      return <Video className={iconClass} />
    } else if (obj === 'BRAND_AWARENESS' || obj === 'OUTCOME_AWARENESS') {
      // Mức độ nhận biết - Megaphone
      return <Megaphone className={iconClass} />
    } else if (obj === 'REACH') {
      // Tiếp cận - Trending up
      return <TrendingUp className={iconClass} />
    } else if (obj === 'OUTCOME_APP_PROMOTION') {
      // Quảng cáo ứng dụng - Users
      return <Users className={iconClass} />
    } else {
      // Default - Target
      return <Target className={iconClass} />
    }
  }

  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0.00'
    return ((clicks / impressions) * 100).toFixed(2)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setStatusFilter(['ACTIVE'])
  }

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) => {
      if (prev.includes(status)) {
        // Remove status if already selected
        const newFilter = prev.filter((s) => s !== status)
        // Ensure at least one status is selected
        return newFilter.length > 0 ? newFilter : ['ACTIVE']
      } else {
        // Add status
        return [...prev, status]
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Chiến dịch</h1>
          <p className="text-gray-600 mt-1 text-xs sm:text-sm">Quản lý các chiến dịch quảng cáo của bạn</p>
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
                onChange={(e) => {
                  setDatePreset(e.target.value)
                  if (e.target.value !== 'custom') {
                    setCustomDateRange(null)
                  } else {
                    // Set default custom range: yesterday 3h to today 3h
                    const yesterday = new Date()
                    yesterday.setDate(yesterday.getDate() - 1)
                    const today = new Date()
                    setCustomDateRange({
                      startDate: yesterday.toISOString().split('T')[0],
                      startTime: '03:00',
                      endDate: today.toISOString().split('T')[0],
                      endTime: '03:00'
                    })
                  }
                }}
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
                <option value="custom">Tùy chỉnh</option>
              </select>
              {datePreset === 'custom' && customDateRange && (
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <div className="flex items-center gap-1 text-xs sm:text-sm">
                    <input
                      type="date"
                      value={customDateRange.startDate}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                      className="border-0 focus:ring-0 p-0 text-xs sm:text-sm"
                    />
                    <input
                      type="time"
                      value={customDateRange.startTime}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, startTime: e.target.value })}
                      className="border-0 focus:ring-0 p-0 text-xs sm:text-sm w-20"
                    />
                    <span className="text-gray-500">đến</span>
                    <input
                      type="date"
                      value={customDateRange.endDate}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                      className="border-0 focus:ring-0 p-0 text-xs sm:text-sm"
                    />
                    <input
                      type="time"
                      value={customDateRange.endTime}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, endTime: e.target.value })}
                      className="border-0 focus:ring-0 p-0 text-xs sm:text-sm w-20"
                    />
                  </div>
                </div>
              )}
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Làm mới dữ liệu"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </>
          )}
          <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm sm:text-base">
            <Plus size={20} />
            <span className="hidden sm:inline">Tạo chiến dịch</span>
            <span className="sm:hidden">Tạo</span>
          </button>
        </div>
      </div>

      {/* Rate Limit Warning */}
      {rateLimitError && selectedAccountId && (
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
      {lastFetchTime > 0 && !rateLimitError && selectedAccountId && (
        <div className="text-xs text-gray-500 flex items-center space-x-1 mb-2">
          <Clock size={12} />
          <span>
            Cập nhật lần cuối: {new Date(lastFetchTime).toLocaleTimeString('vi-VN')} 
            (Tự động cập nhật mỗi {Math.floor(refreshInterval / 1000)} giây)
          </span>
        </div>
      )}

      {!selectedAccountId ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Chọn tài khoản</h3>
          <p className="mt-1 text-sm text-gray-500">Vui lòng chọn tài khoản để xem chiến dịch.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Không có chiến dịch</h3>
          <p className="mt-1 text-sm text-gray-500">Tài khoản này chưa có chiến dịch nào.</p>
        </div>
      ) : (
        <>
          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-col gap-2">
              {/* First Row: Search and Status Filters */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
                {/* Search Input */}
                <div className="flex-1 relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, ID hoặc mục tiêu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Status Filter Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Trạng thái:</span>
                  {[
                    { value: 'ACTIVE', label: 'Đang chạy', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
                    { value: 'PAUSED', label: 'Tạm dừng', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
                    { value: 'ARCHIVED', label: 'Đã lưu trữ', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
                    { value: 'DELETED', label: 'Đã xóa', color: 'bg-red-100 text-red-800 hover:bg-red-200' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => toggleStatusFilter(status.value)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border-2 ${
                        statusFilter.includes(status.value)
                          ? `${status.color} border-primary-500`
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {statusFilter.includes(status.value) && '✓ '}
                      {status.label}
                    </button>
                  ))}
                </div>

                {/* Clear Filters */}
                {(searchQuery || (statusFilter.length > 0 && !statusFilter.includes('ACTIVE')) || statusFilter.length > 1) && (
                  <button
                    onClick={clearSearch}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>

            {/* Results Count */}
            {(filteredCampaigns.length !== campaigns.length || searchQuery || statusFilter.length > 0) && (
              <div className="mt-3 text-sm text-gray-600">
                Hiển thị {filteredCampaigns.length} / {campaigns.length} chiến dịch
              </div>
            )}
          </div>

          {/* Desktop Campaigns Table */}
          <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="overflow-y-auto flex-1" style={{ width: '100%', overflowX: 'hidden' }}>
              <table className="w-full divide-y divide-gray-200 text-sm" style={{ width: '100%', tableLayout: 'auto' }}>
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '2%' }}>
                    </th>
                    <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '18%' }}>
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                      >
                        <span>Chiến dịch</span>
                        {getSortIcon('name')}
                      </button>
                    </th>
                    <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '8%' }}>
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center space-x-0.5 hover:text-gray-700 transition-colors"
                      >
                        <span>TT</span>
                        {getSortIcon('status')}
                      </button>
                    </th>
                    <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '8%' }}>
                      <button
                        onClick={() => handleSort('objective')}
                        className="flex items-center space-x-0.5 hover:text-gray-700 transition-colors"
                      >
                        <Target className="h-3 w-3 text-primary-600" />
                        <span>Mục tiêu</span>
                        {getSortIcon('objective')}
                      </button>
                    </th>
                    <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '8%' }}>
                      <button
                        onClick={() => handleSort('impressions')}
                        className="flex items-center space-x-0.5 hover:text-gray-700 transition-colors"
                      >
                        <span>Hiển thị</span>
                        {getSortIcon('impressions')}
                      </button>
                    </th>
                    <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '7%' }}>
                      <button
                        onClick={() => handleSort('clicks')}
                        className="flex items-center space-x-0.5 hover:text-gray-700 transition-colors"
                      >
                        <span>Nhấp</span>
                        {getSortIcon('clicks')}
                      </button>
                    </th>
                    <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '7%' }}>
                      <button
                        onClick={() => handleSort('messages')}
                        className="flex items-center space-x-0.5 hover:text-gray-700 transition-colors"
                      >
                        <span>Liên hệ</span>
                        {getSortIcon('messages')}
                      </button>
                    </th>
                    <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '7%' }}>
                      <button
                        onClick={() => handleSort('cpc')}
                        className="flex items-center space-x-0.5 hover:text-gray-700 transition-colors group relative"
                        title="CPC (Cost Per Click): Chi phí mỗi lượt nhấp = Tổng chi tiêu / Số lượt nhấp. Chỉ số này cho biết chi phí trung bình để có một lượt nhấp."
                      >
                        <span>CPC</span>
                        {getSortIcon('cpc')}
                        <span className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <strong>CPC (Cost Per Click)</strong><br/>
                          Chi phí mỗi lượt nhấp = Tổng chi tiêu / Số lượt nhấp<br/>
                          <span className="text-gray-300">Chỉ số này cho biết chi phí trung bình để có một lượt nhấp. CPC thấp = hiệu quả chi phí tốt.</span>
                        </span>
                      </button>
                    </th>
                    <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '6%' }}>
                      <button
                        onClick={() => handleSort('ctr')}
                        className="flex items-center space-x-0.5 hover:text-gray-700 transition-colors group relative"
                        title="CTR (Click-Through Rate): Tỷ lệ nhấp = (Số lượt nhấp / Số lượt hiển thị) × 100%. Chỉ số này cho biết mức độ hấp dẫn của quảng cáo."
                      >
                        <span>CTR</span>
                        {getSortIcon('ctr')}
                        <span className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <strong>CTR (Click-Through Rate)</strong><br/>
                          Tỷ lệ nhấp = (Số lượt nhấp / Số lượt hiển thị) × 100%<br/>
                          <span className="text-gray-300">Chỉ số này cho biết mức độ hấp dẫn của quảng cáo. CTR cao = quảng cáo hiệu quả.</span>
                        </span>
                      </button>
                    </th>
                    <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '9%' }}>
                      <button
                        onClick={() => handleSort('spend')}
                        className="flex items-center space-x-0.5 hover:text-gray-700 transition-colors"
                      >
                        <span>Chi tiêu</span>
                        {getSortIcon('spend')}
                      </button>
                    </th>
                    <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '8%' }}>
                      <button
                        onClick={() => handleSort('spendPerOrder')}
                        className="flex items-center space-x-0.5 hover:text-purple-700 transition-colors group relative"
                      >
                        <span className="text-purple-600 font-semibold">Chi/Đơn</span>
                        {getSortIcon('spendPerOrder')}
                        <span className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <strong>Chi tiêu/Đơn</strong><br/>
                          Tỉ lệ chi tiêu trên mỗi đơn hàng = Tổng chi tiêu / Số đơn hàng<br/>
                          <span className="text-gray-300">Chỉ số này cho biết chi phí trung bình để có được một đơn hàng.</span>
                        </span>
                      </button>
                    </th>
                    <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '6%' }}>
                      <button
                        onClick={() => handleSort('results')}
                        className="flex items-center space-x-1 hover:text-blue-700 transition-colors"
                      >
                        <span className="text-blue-600 font-semibold">Kết quả</span>
                        {getSortIcon('results')}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center">
                        <Megaphone className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Không tìm thấy chiến dịch</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {searchQuery || statusFilter.length > 0
                            ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                            : 'Tài khoản này chưa có chiến dịch nào.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedCampaigns.map((campaign) => {
                      const isExpanded = expandedRows.has(campaign.id)
                      return (
                        <React.Fragment key={campaign.id}>
                        <>
                          <tr 
                            key={campaign.id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleRow(campaign.id)}
                          >
                            <td className="px-1 py-1.5 text-center">
                              {isExpanded ? (
                                <ChevronDown size={14} className="text-gray-500" />
                              ) : (
                                <ChevronRight size={14} className="text-gray-500" />
                              )}
                            </td>
                            <td className="px-1.5 py-1.5">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-full bg-primary-100">
                                  <Megaphone className="h-3 w-3 text-primary-600" />
                                </div>
                                <div className="ml-1.5 min-w-0">
                                  <div className="text-xs font-medium text-gray-900 truncate">{campaign.name}</div>
                                  <div className="text-xs text-gray-500 truncate">ID: {campaign.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-1.5 py-1.5 whitespace-nowrap">
                              {getStatusBadge(campaign)}
                            </td>
                            <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-gray-900">
                              <div className="flex items-center space-x-1">
                                {getObjectiveIcon(campaign.objective)}
                                <span className="truncate max-w-[80px]">{getObjectiveLabel(campaign.objective)}</span>
                              </div>
                            </td>
                            <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-gray-900">
                              {formatNumber(campaign.impressions)}
                            </td>
                            <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-gray-900">
                              {formatNumber(campaign.clicks)}
                            </td>
                            <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-gray-900">
                              {formatNumber(campaign.messages || 0)}
                            </td>
                            <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-gray-900">
                              {campaign.cpc !== undefined && campaign.cpc > 0
                                ? formatCurrency(campaign.cpc)
                                : campaign.clicks > 0 && campaign.spend > 0
                                  ? formatCurrency(campaign.spend / campaign.clicks)
                                  : '-'}
                            </td>
                            <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-gray-900">
                              {campaign.ctr !== undefined 
                                ? parseFloat(campaign.ctr.toString()).toFixed(2) + '%'
                                : calculateCTR(campaign.clicks, campaign.impressions) + '%'}
                            </td>
                            <td className="px-1.5 py-1.5 whitespace-nowrap text-xs text-gray-900 font-semibold">
                              {formatCurrency(campaign.spend)}
                            </td>
                            <td className="px-1.5 py-1.5 whitespace-nowrap text-xs font-semibold">
                              <span className="text-purple-600">
                                {campaign.results && campaign.results > 0
                                  ? formatCurrency(campaign.spend / campaign.results)
                                  : '-'}
                              </span>
                            </td>
                            <td className="px-1.5 py-1.5 whitespace-nowrap text-xs font-semibold">
                              <span className="text-blue-600">{formatNumber(campaign.results || 0)}</span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${campaign.id}-expanded`} className="bg-gray-50">
                              <td colSpan={11} className="px-3 py-2">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  <div>
                                    <div className="text-xs text-gray-500 mb-1">Ngân sách/ngày</div>
                                    <div className="font-medium text-gray-900">
                                      {campaign.daily_budget !== null && campaign.daily_budget !== undefined && campaign.daily_budget !== 0
                                        ? formatCurrency(typeof campaign.daily_budget === 'string' ? parseFloat(campaign.daily_budget) : campaign.daily_budget) + ' /ngày'
                                        : campaign.lifetime_budget !== null && campaign.lifetime_budget !== undefined && campaign.lifetime_budget !== 0
                                          ? formatCurrency(typeof campaign.lifetime_budget === 'string' ? parseFloat(campaign.lifetime_budget) : campaign.lifetime_budget) + ' (tổng)'
                                          : '-'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500 mb-1 group relative inline-block">
                                      <span className="cursor-help">CPM</span>
                                      <span className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                        <strong>CPM (Cost Per Mille)</strong><br/>
                                        Chi phí mỗi 1000 lượt hiển thị = (Tổng chi tiêu / Số lượt hiển thị) × 1000<br/>
                                        <span className="text-gray-300">Chỉ số này cho biết chi phí để có 1000 lượt hiển thị quảng cáo.</span>
                                      </span>
                                    </div>
                                    <div className="font-medium text-gray-900">
                                      {campaign.cpm !== undefined && campaign.cpm > 0
                                        ? formatCurrency(campaign.cpm)
                                        : campaign.impressions > 0 && campaign.spend > 0
                                          ? formatCurrency((campaign.spend / campaign.impressions) * 1000)
                                          : '-'}
                                    </div>
                                  </div>
                                  {campaign.reach !== undefined && campaign.reach > 0 && (
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1 group relative inline-block">
                                        <span className="cursor-help">Tiếp cận</span>
                                        <span className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                          <strong>Reach (Tiếp cận)</strong><br/>
                                          Số lượng người dùng duy nhất đã thấy quảng cáo ít nhất một lần<br/>
                                          <span className="text-gray-300">Chỉ số này cho biết độ rộng của đối tượng đã tiếp cận.</span>
                                        </span>
                                      </div>
                                      <div className="font-medium text-gray-900">
                                        {formatNumber(campaign.reach)}
                                      </div>
                                    </div>
                                  )}
                                  {(campaign.frequency !== undefined && campaign.frequency > 0) || (campaign.reach !== undefined && campaign.reach > 0 && campaign.impressions > 0) ? (
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1 group relative inline-block">
                                        <span className="cursor-help">Tần suất</span>
                                        <span className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                          <strong>Frequency (Tần suất)</strong><br/>
                                          Số lần trung bình một người thấy quảng cáo = Lượt hiển thị / Tiếp cận<br/>
                                          <span className="text-gray-300">Tần suất cao (&gt;3) có thể gây ad fatigue. Tần suất lý tưởng: 1.5-3.</span>
                                        </span>
                                      </div>
                                      <div className="font-medium text-gray-900">
                                        {campaign.frequency !== undefined && campaign.frequency > 0
                                          ? parseFloat(campaign.frequency.toString()).toFixed(2)
                                          : campaign.reach && campaign.reach > 0 && campaign.impressions > 0
                                            ? (campaign.impressions / campaign.reach).toFixed(2)
                                            : '-'}
                                      </div>
                                    </div>
                                  ) : null}
                                  {campaign.created_time && (
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">Ngày tạo</div>
                                      <div className="font-medium text-gray-900">
                                        {new Date(campaign.created_time).toLocaleDateString('vi-VN')}
                                      </div>
                                    </div>
                                  )}
                                  {campaign.start_time && (
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">Ngày bắt đầu</div>
                                      <div className="font-medium text-gray-900">
                                        {new Date(campaign.start_time).toLocaleDateString('vi-VN')}
                                      </div>
                                    </div>
                                  )}
                                  {campaign.stop_time && (
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">Ngày kết thúc</div>
                                      <div className="font-medium text-gray-900">
                                        {new Date(campaign.stop_time).toLocaleDateString('vi-VN')}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Actions Section */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                    {campaign.status === 'ACTIVE' ? (
                                      <button
                                        className="px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors border border-yellow-200"
                                        title="Tạm dừng"
                                      >
                                        <Pause size={16} className="inline mr-2" />
                                        Tạm dừng
                                      </button>
                                    ) : (
                                      <button
                                        className="px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200"
                                        title="Kích hoạt"
                                      >
                                        <Play size={16} className="inline mr-2" />
                                        Kích hoạt
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedCampaignForDetail(campaign)
                                        setIsDetailOffcanvasOpen(true)
                                      }}
                                      className="px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
                                      title="Xem chi tiết"
                                    >
                                      <FileText size={16} className="inline mr-2" />
                                      Xem chi tiết
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
                {filteredCampaigns.length > 0 && (
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                    <tr>
                      <td className="px-2 py-3 text-center"></td>
                      <td colSpan={3} className="px-1.5 py-2 text-xs font-bold text-gray-900">
                        Tổng
                      </td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-xs font-bold text-gray-900">
                        {formatNumber(totals.impressions)}
                      </td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-xs font-bold text-gray-900">
                        {formatNumber(totals.clicks)}
                      </td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-xs font-bold text-gray-900">
                        {formatNumber(totals.messages)}
                      </td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-xs font-bold text-gray-900">
                        -
                      </td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-xs font-bold text-gray-900">
                        -
                      </td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-xs font-bold text-gray-900">
                        {formatCurrency(totals.spend)}
                      </td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-xs font-bold">
                        <span className="text-purple-600">
                          {totals.results > 0
                            ? formatCurrency(totals.spend / totals.results)
                            : '-'}
                        </span>
                      </td>
                      <td className="px-1.5 py-2 whitespace-nowrap text-xs font-bold">
                        <span className="text-blue-600">{formatNumber(totals.results)}</span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            
            {/* Pagination */}
            {filteredCampaigns.length > itemsPerPage && (
              <div className="bg-white px-3 py-2 flex items-center justify-between border-t border-gray-200 sm:px-4 rounded-b-lg">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                        className="relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trước
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-gray-700">
                      Hiển thị <span className="font-medium">{startIndex + 1}</span> đến{' '}
                      <span className="font-medium">{Math.min(endIndex, filteredCampaigns.length)}</span> trong tổng số{' '}
                      <span className="font-medium">{filteredCampaigns.length}</span> chiến dịch
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-1.5 py-1.5 rounded-l-md border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`relative inline-flex items-center px-3 py-1.5 border text-xs font-medium ${
                                currentPage === page
                                  ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span
                              key={page}
                              className="relative inline-flex items-center px-3 py-1.5 border border-gray-300 bg-white text-xs font-medium text-gray-700"
                            >
                              ...
                            </span>
                          )
                        }
                        return null
                      })}
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-1.5 py-1.5 rounded-r-md border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredCampaigns.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Megaphone className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Không tìm thấy chiến dịch</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                    : 'Tài khoản này chưa có chiến dịch nào.'}
                </p>
              </div>
            ) : (
              paginatedCampaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-primary-100">
                        <Megaphone className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{campaign.name}</div>
                        <div className="text-xs text-gray-500 truncate">ID: {campaign.id}</div>
                      </div>
                    </div>
                    <div className="ml-2">
                      {getStatusBadge(campaign)}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Mục tiêu</div>
                    <div className="flex items-center space-x-2 text-sm text-gray-900">
                      {getObjectiveIcon(campaign.objective)}
                      <span>{getObjectiveLabel(campaign.objective)}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Ngân sách/ngày</div>
                    <div className="text-sm text-gray-900">
                      {campaign.daily_budget !== null && campaign.daily_budget !== undefined && campaign.daily_budget !== 0
                        ? formatCurrency(typeof campaign.daily_budget === 'string' ? parseFloat(campaign.daily_budget) : campaign.daily_budget) + ' /ngày'
                        : campaign.lifetime_budget !== null && campaign.lifetime_budget !== undefined && campaign.lifetime_budget !== 0
                          ? formatCurrency(typeof campaign.lifetime_budget === 'string' ? parseFloat(campaign.lifetime_budget) : campaign.lifetime_budget) + ' (tổng)'
                          : '-'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Lượt hiển thị</div>
                      <div className="font-medium text-gray-900">{formatNumber(campaign.impressions)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Lượt nhấp</div>
                      <div className="font-medium text-gray-900">{formatNumber(campaign.clicks)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Người liên hệ</div>
                      <div className="font-medium text-gray-900">{formatNumber(campaign.messages || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 group relative inline-block">
                        <span className="cursor-help">CTR</span>
                        <span className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <strong>CTR (Click-Through Rate)</strong><br/>
                          Tỷ lệ nhấp = (Số lượt nhấp / Số lượt hiển thị) × 100%<br/>
                          <span className="text-gray-300">Chỉ số này cho biết mức độ hấp dẫn của quảng cáo.</span>
                        </span>
                      </div>
                      <div className="font-medium text-gray-900">
                        {campaign.ctr !== undefined 
                          ? parseFloat(campaign.ctr.toString()).toFixed(2) + '%'
                          : calculateCTR(campaign.clicks, campaign.impressions) + '%'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 group relative inline-block">
                        <span className="cursor-help">CPM</span>
                        <span className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <strong>CPM (Cost Per Mille)</strong><br/>
                          Chi phí mỗi 1000 lượt hiển thị = (Tổng chi tiêu / Số lượt hiển thị) × 1000<br/>
                          <span className="text-gray-300">Chỉ số này cho biết chi phí để có 1000 lượt hiển thị quảng cáo.</span>
                        </span>
                      </div>
                      <div className="font-medium text-gray-900">
                        {campaign.cpm !== undefined && campaign.cpm > 0
                          ? formatCurrency(campaign.cpm)
                          : campaign.impressions > 0 && campaign.spend > 0
                            ? formatCurrency((campaign.spend / campaign.impressions) * 1000)
                            : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 group relative inline-block">
                        <span className="cursor-help">CPC</span>
                        <span className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <strong>CPC (Cost Per Click)</strong><br/>
                          Chi phí mỗi lượt nhấp = Tổng chi tiêu / Số lượt nhấp<br/>
                          <span className="text-gray-300">Chỉ số này cho biết chi phí trung bình để có một lượt nhấp.</span>
                        </span>
                      </div>
                      <div className="font-medium text-gray-900">
                        {campaign.cpc !== undefined && campaign.cpc > 0
                          ? formatCurrency(campaign.cpc)
                          : campaign.clicks > 0 && campaign.spend > 0
                            ? formatCurrency(campaign.spend / campaign.clicks)
                            : '-'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500 mb-1">Đã chi tiêu</div>
                      <div className="font-semibold text-gray-900">{formatCurrency(campaign.spend)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-purple-600 font-medium mb-1">Chi tiêu/Đơn</div>
                      <div className="font-semibold text-purple-600">
                        {campaign.results && campaign.results > 0
                          ? formatCurrency(campaign.spend / campaign.results)
                          : '-'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-blue-600 font-medium mb-1">Kết quả</div>
                      <div className="font-semibold text-blue-600">{formatNumber(campaign.results || 0)}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200 flex justify-end space-x-2">
                    {campaign.status === 'ACTIVE' ? (
                      <button
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Tạm dừng"
                      >
                        <Pause size={18} />
                      </button>
                    ) : (
                      <button
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Kích hoạt"
                      >
                        <Play size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedCampaignForDetail(campaign)
                        setIsDetailOffcanvasOpen(true)
                      }}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Xem chi tiết"
                    >
                      <FileText size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
            
            {/* Mobile Pagination */}
            {filteredCampaigns.length > itemsPerPage && (
              <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-700">
                    Trang <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    Hiển thị <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, filteredCampaigns.length)}</span> / <span className="font-medium">{filteredCampaigns.length}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Trước
                  </button>
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page: number
                      if (totalPages <= 5) {
                        page = i + 1
                      } else if (currentPage <= 3) {
                        page = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i
                      } else {
                        page = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            currentPage === page
                              ? 'bg-primary-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Mobile Total Summary Card */}
            {filteredCampaigns.length > 0 && (
              <div className="bg-gray-100 rounded-lg shadow p-4 border-2 border-gray-300">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Tổng</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Lượt hiển thị</div>
                    <div className="font-bold text-gray-900">{formatNumber(totals.impressions)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Lượt nhấp</div>
                    <div className="font-bold text-gray-900">{formatNumber(totals.clicks)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Người liên hệ</div>
                    <div className="font-bold text-gray-900">{formatNumber(totals.messages)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Đã chi tiêu</div>
                    <div className="font-bold text-gray-900">{formatCurrency(totals.spend)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-purple-600 font-medium mb-1">Chi tiêu/Đơn</div>
                    <div className="font-bold text-purple-600">
                      {totals.results > 0
                        ? formatCurrency(totals.spend / totals.results)
                        : '-'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-blue-600 font-medium mb-1">Kết quả</div>
                    <div className="font-bold text-blue-600">{formatNumber(totals.results)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Campaign Detail Offcanvas */}
      <CampaignDetailOffcanvas
        isOpen={isDetailOffcanvasOpen}
        onClose={() => {
          setIsDetailOffcanvasOpen(false)
          setSelectedCampaignForDetail(null)
        }}
        campaign={selectedCampaignForDetail}
        accountId={selectedAccountId}
      />
    </div>
  )
}

export default Campaigns
