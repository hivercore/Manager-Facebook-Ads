import { useEffect, useState, useRef } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Eye, 
  MousePointerClick, 
  DollarSign, 
  RefreshCw,
  Users,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { api } from '../services/api'
import AccountSelector from '../components/AccountSelector'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface Insights {
  impressions: number
  clicks: number
  spend: number
  reach: number
  cpm: number
  cpc: number
  ctr: number
  conversions?: number
  timeSeries?: Array<{
    date_start: string
    date_stop: string
    impressions: string
    clicks: string
    spend: string
    reach?: string
    cpm?: string
    cpc?: string
    ctr?: string
  }>
}

interface PreviousPeriodInsights {
  impressions: number
  clicks: number
  spend: number
  reach: number
  cpm: number
  cpc: number
  ctr: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const Analytics = () => {
  const [insights, setInsights] = useState<Insights | null>(null)
  const [previousInsights, setPreviousInsights] = useState<PreviousPeriodInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState('today')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<number>(120000) // 2 minutes for analytics
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  const [rateLimitError, setRateLimitError] = useState<boolean>(false)
  const [isManualRefresh, setIsManualRefresh] = useState<boolean>(false)
  const [isFetching, setIsFetching] = useState<boolean>(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    // Allow null (all accounts) or specific account
    fetchInsights()
    fetchPreviousPeriodInsights()
  }, [datePreset, selectedAccountId])

  // Smart polling for analytics
  useEffect(() => {
    if (!selectedAccountId || isManualRefresh || rateLimitError || isFetching) return

    const interval = setInterval(() => {
      if (mounted.current && !isFetching) {
        fetchInsights(false)
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [selectedAccountId, datePreset, refreshInterval, isManualRefresh, rateLimitError, isFetching])

  const getPreviousPeriodPreset = (currentPreset: string): string => {
    const presetMap: { [key: string]: string } = {
      'today': 'yesterday',
      'yesterday': '2_days_ago',
      'last_7d': 'previous_7d',
      'last_14d': 'previous_14d',
      'last_28d': 'previous_28d',
      'last_30d': 'previous_30d',
    }
    return presetMap[currentPreset] || 'previous_7d'
  }

  const fetchInsights = async (isManual = false) => {
    if (isFetching) return

    try {
      setIsFetching(true)
      setIsManualRefresh(isManual)
      if (isManual) {
        setLoading(true)
      }
      setError(null)
      
      const params: any = { datePreset }
      if (selectedAccountId) {
        params.accountId = selectedAccountId
      }
      
      const response = await api.get('/insights', { params })
      
      if (mounted.current) {
        setInsights(response.data)
        setLastFetchTime(Date.now())
        
        // Reset rate limit error on success
        if (rateLimitError) {
          setRateLimitError(false)
          setRefreshInterval(120000) // Reset to 2 minutes
        }
      }
    } catch (err: any) {
      console.error('Error fetching insights:', err)
      if (mounted.current) {
        setError(err.response?.data?.error || 'Không thể tải dữ liệu phân tích')
        setInsights(null)
        
        // Handle rate limiting
        if (err.response?.status === 429 || err.message?.includes('rate limit')) {
          setRateLimitError(true)
          setRefreshInterval(prev => Math.min(prev * 2, 600000)) // Max 10 minutes
        }
      }
    } finally {
      if (mounted.current) {
        setIsFetching(false)
        setLoading(false)
      }
    }
  }

  const fetchPreviousPeriodInsights = async () => {
    // Allow null (all accounts) or specific account

    try {
      const previousPreset = getPreviousPeriodPreset(datePreset)
      const params: any = { datePreset: previousPreset }
      if (selectedAccountId) {
        params.accountId = selectedAccountId
      }
      
      const response = await api.get('/insights', { params })
      
      if (mounted.current) {
        setPreviousInsights(response.data)
      }
    } catch (err: any) {
      console.error('Error fetching previous period insights:', err)
      // Don't set error for previous period, just log it
    }
  }

  const handleManualRefresh = () => {
    fetchInsights(true)
    fetchPreviousPeriodInsights()
  }

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(numAmount)
  }

  const formatNumber = (num: number | string) => {
    const numValue = typeof num === 'string' ? parseInt(num) : num
    return new Intl.NumberFormat('vi-VN').format(numValue)
  }

  const calculateChange = (current: number, previous: number): { value: number; percentage: number } => {
    if (previous === 0) {
      return { value: current, percentage: current > 0 ? 100 : 0 }
    }
    const change = current - previous
    const percentage = (change / previous) * 100
    return { value: change, percentage }
  }

  const formatLastUpdateTime = () => {
    if (lastFetchTime === 0) return ''
    const now = Date.now()
    const diff = Math.floor((now - lastFetchTime) / 1000)
    
    if (diff < 60) return `${diff} giây trước`
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
    return `${Math.floor(diff / 3600)} giờ trước`
  }

  const formatRefreshInterval = () => {
    const minutes = Math.floor(refreshInterval / 60000)
    return `${minutes} phút`
  }

  // Prepare chart data from time series
  const prepareChartData = () => {
    if (!insights?.timeSeries || insights.timeSeries.length === 0) {
      return []
    }

    return insights.timeSeries.map((item) => {
      const date = new Date(item.date_start)
      const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()]
      const dayMonth = `${date.getDate()}/${date.getMonth() + 1}`
      
      return {
        name: `${dayName} ${dayMonth}`,
        date: item.date_start,
        impressions: parseInt(item.impressions || '0'),
        clicks: parseInt(item.clicks || '0'),
        spend: parseFloat(item.spend || '0'),
        reach: parseInt(item.reach || '0'),
        ctr: parseFloat(item.ctr || '0'),
        cpc: parseFloat(item.cpc || '0'),
        cpm: parseFloat(item.cpm || '0'),
      }
    })
  }

  const chartData = prepareChartData()

  // Prepare pie chart data for spend distribution
  const preparePieChartData = () => {
    if (!chartData.length) return []
    
    const totalSpend = chartData.reduce((sum, item) => sum + item.spend, 0)
    if (totalSpend === 0) return []

    // Group by day of week
    const dayGroups: { [key: string]: number } = {}
    chartData.forEach(item => {
      const dayName = item.name.split(' ')[0]
      dayGroups[dayName] = (dayGroups[dayName] || 0) + item.spend
    })

    return Object.entries(dayGroups).map(([name, value]) => ({
      name,
      value: Math.round((value / totalSpend) * 100)
    }))
  }

  const pieChartData = preparePieChartData()

  const renderMetricCard = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    bgColor: string,
    iconColor: string,
    previousValue?: number,
    formatter: (val: number | string) => string = formatNumber
  ) => {
    const change = previousValue !== undefined && previousInsights
      ? calculateChange(
          typeof value === 'string' ? parseFloat(value) : value,
          previousValue
        )
      : null

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatter(value)}
            </p>
            {change && (
              <div className={`flex items-center mt-2 text-sm ${
                change.percentage >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {change.percentage >= 0 ? (
                  <ArrowUpRight size={16} className="mr-1" />
                ) : (
                  <ArrowDownRight size={16} className="mr-1" />
                )}
                <span>
                  {change.percentage >= 0 ? '+' : ''}{change.percentage.toFixed(1)}%
                </span>
                <span className="text-gray-500 ml-1">so với kỳ trước</span>
              </div>
            )}
          </div>
          <div className={`p-3 ${bgColor} rounded-full`}>
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Phân tích</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Phân tích hiệu suất quảng cáo của bạn</p>
          {lastFetchTime > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Cập nhật lần cuối: {formatLastUpdateTime()} (Tự động cập nhật mỗi {formatRefreshInterval()})
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AccountSelector
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            showAllOption={true}
          />
          {selectedAccountId !== null && (
            <>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="last_7d">7 ngày qua</option>
                <option value="last_14d">14 ngày qua</option>
                <option value="last_28d">28 ngày qua</option>
                <option value="last_30d">30 ngày qua</option>
              </select>
              <button
                onClick={handleManualRefresh}
                disabled={isFetching}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Làm mới"
              >
                <RefreshCw size={20} className={isFetching ? 'animate-spin' : ''} />
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          {rateLimitError && (
            <p className="text-sm text-red-500 mt-2">
              Đang gặp vấn đề về rate limit. Tự động thử lại sau {formatRefreshInterval()}.
            </p>
          )}
        </div>
      ) : !insights ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Không có dữ liệu</h3>
          <p className="mt-1 text-sm text-gray-500">Không có dữ liệu phân tích cho khoảng thời gian này.</p>
        </div>
      ) : (
        <>
          {/* Key Metrics with Trend Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {renderMetricCard(
              'Lượt hiển thị',
              insights.impressions || 0,
              <Eye className="h-6 w-6" />,
              'bg-blue-100',
              'text-blue-600',
              previousInsights?.impressions
            )}
            {renderMetricCard(
              'Lượt nhấp',
              insights.clicks || 0,
              <MousePointerClick className="h-6 w-6" />,
              'bg-green-100',
              'text-green-600',
              previousInsights?.clicks
            )}
            {renderMetricCard(
              'Tổng chi tiêu',
              insights.spend || 0,
              <DollarSign className="h-6 w-6" />,
              'bg-yellow-100',
              'text-yellow-600',
              previousInsights?.spend,
              formatCurrency
            )}
            {renderMetricCard(
              'CTR',
              `${parseFloat(insights.ctr?.toString() || '0').toFixed(2)}%`,
              <TrendingUp className="h-6 w-6" />,
              'bg-purple-100',
              'text-purple-600',
              previousInsights?.ctr,
              (val) => val as string
            )}
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {renderMetricCard(
              'Reach',
              insights.reach || 0,
              <Users className="h-6 w-6" />,
              'bg-indigo-100',
              'text-indigo-600',
              previousInsights?.reach
            )}
            {renderMetricCard(
              'CPM',
              insights.cpm || 0,
              <Target className="h-6 w-6" />,
              'bg-pink-100',
              'text-pink-600',
              previousInsights?.cpm,
              formatCurrency
            )}
            {renderMetricCard(
              'CPC',
              insights.cpc || 0,
              <Activity className="h-6 w-6" />,
              'bg-orange-100',
              'text-orange-600',
              previousInsights?.cpc,
              formatCurrency
            )}
            {insights.conversions !== undefined && renderMetricCard(
              'Conversions',
              insights.conversions || 0,
              <Target className="h-6 w-6" />,
              'bg-teal-100',
              'text-teal-600'
            )}
          </div>

          {/* Charts */}
          {chartData.length > 0 && (
            <>
              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Impressions & Clicks Line Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Lượt hiển thị & Lượt nhấp</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="impressions" 
                        stroke="#3b82f6" 
                        name="Lượt hiển thị"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#10b981" 
                        name="Lượt nhấp"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Spend Area Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiêu theo ngày</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="spend" 
                        stroke="#f59e0b" 
                        fill="#f59e0b"
                        fillOpacity={0.6}
                        name="Chi tiêu"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Secondary Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CTR & CPC Line Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">CTR & CPC</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="ctr" 
                        stroke="#8b5cf6" 
                        name="CTR (%)"
                        strokeWidth={2}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="cpc" 
                        stroke="#ef4444" 
                        name="CPC (₫)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Spend Distribution Pie Chart */}
                {pieChartData.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bổ chi tiêu theo ngày</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Performance Metrics Table */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Chỉ số hiệu suất chi tiết</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  <div>
                    <p className="text-sm text-gray-600">CPM</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {formatCurrency(insights.cpm || 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Chi phí/1000 hiển thị</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">CPC</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {formatCurrency(insights.cpc || 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Chi phí/lượt nhấp</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">CTR</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {parseFloat(insights.ctr?.toString() || '0').toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Tỷ lệ nhấp</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reach</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {formatNumber(insights.reach || 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Lượt tiếp cận</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Analytics
