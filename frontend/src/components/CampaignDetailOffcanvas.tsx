import { useEffect, useState } from 'react'
import { X, Eye, MousePointerClick, DollarSign, TrendingUp, Users, Target, Activity, BarChart3, Sparkles, AlertCircle, CheckCircle2, Clock, Calendar, HelpCircle, TrendingDown, Zap, Award, Percent } from 'lucide-react'
import { api } from '../services/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'

// Tooltip Component
const Tooltip = ({ text, children, className = '', position = 'top' }: { text: string; children: React.ReactNode; className?: string; position?: 'top' | 'bottom' | 'left' | 'right' }) => {
  const positionClasses = {
    top: 'left-1/2 -translate-x-1/2 bottom-full mb-2',
    bottom: 'left-1/2 -translate-x-1/2 top-full mt-2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2'
  }

  return (
    <div className={`group relative inline-block ${className}`}>
      {children}
      <div className={`absolute ${positionClasses[position]} w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none`}>
        <div dangerouslySetInnerHTML={{ __html: text }} />
        {/* Arrow */}
        {position === 'top' && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        )}
        {position === 'bottom' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
        )}
      </div>
    </div>
  )
}

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

interface CampaignDetailOffcanvasProps {
  isOpen: boolean
  onClose: () => void
  campaign: Campaign | null
  accountId: string | null
}

interface CampaignDetails {
  adSets?: any[]
  ads?: any[]
  insights?: any
  timeSeries?: any[]
}

interface AIInsight {
  summary: string
  recommendations: string[]
  performance: {
    score: number
    label: string
    color: string
  }
  trends: string[]
  alerts: string[]
}

const CampaignDetailOffcanvas = ({ isOpen, onClose, campaign, accountId }: CampaignDetailOffcanvasProps) => {
  const [details, setDetails] = useState<CampaignDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiInsights, setAiInsights] = useState<AIInsight | null>(null)

  // Map objective to Vietnamese label
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

  useEffect(() => {
    if (isOpen && campaign && accountId) {
      fetchCampaignDetails()
      generateAIInsights()
    } else {
      setDetails(null)
      setAiInsights(null)
    }
  }, [isOpen, campaign?.id, accountId])

  const fetchCampaignDetails = async () => {
    if (!campaign || !accountId) return

    try {
      setLoading(true)
      
      // Fetch campaign-specific details with time series data
      try {
        const campaignDetailsResponse = await api.get(`/campaigns/${campaign.id}`, {
          params: {
            accountId: accountId,
            datePreset: 'last_7d' // Get last 7 days for detailed analysis
          }
        })
        
        // Use campaign details response which includes insights and timeSeries
        const responseData = campaignDetailsResponse.data
        setDetails({
          insights: {
            impressions: responseData.insights?.impressions || campaign.impressions,
            clicks: responseData.insights?.clicks || campaign.clicks,
            spend: responseData.insights?.spend || campaign.spend,
            reach: responseData.insights?.reach || campaign.reach,
            cpm: responseData.insights?.cpm || campaign.cpm,
            cpc: responseData.insights?.cpc || campaign.cpc,
            ctr: responseData.insights?.ctr || campaign.ctr,
            results: responseData.insights?.results || campaign.results,
            frequency: responseData.insights?.frequency || campaign.frequency,
            messages: responseData.insights?.messages || campaign.messages,
          },
          timeSeries: responseData.timeSeries || []
        })
      } catch (error) {
        // Fallback to basic data from campaign prop
        console.error('Error fetching campaign details:', error)
        setDetails({
          insights: {
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            spend: campaign.spend,
            reach: campaign.reach,
            cpm: campaign.cpm,
            cpc: campaign.cpc,
            ctr: campaign.ctr,
            results: campaign.results,
            frequency: campaign.frequency,
            messages: campaign.messages,
          }
        })
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAIInsights = () => {
    if (!campaign) return

    // Generate AI insights based on campaign data
    const ctr = campaign.ctr || 0
    const cpc = campaign.cpc || 0
    const cpm = campaign.cpm || 0
    const impressions = campaign.impressions || 0
    const clicks = campaign.clicks || 0
    const spend = campaign.spend || 0
    const results = campaign.results || 0

    // Calculate performance score (0-100)
    let score = 50 // Base score
    let label = 'Trung bình'
    let color = 'yellow'

    // CTR analysis
    if (ctr > 2) score += 15
    else if (ctr > 1) score += 10
    else if (ctr < 0.5) score -= 10

    // CPC analysis
    if (cpc < 2000) score += 10
    else if (cpc > 5000) score -= 10

    // Results analysis
    if (results > 0) {
      const cpr = spend / results
      if (cpr < 50000) score += 15
      else if (cpr > 100000) score -= 10
    }

    // Impressions analysis
    if (impressions > 10000) score += 5
    if (clicks > 500) score += 5

    score = Math.max(0, Math.min(100, score))

    if (score >= 80) {
      label = 'Xuất sắc'
      color = 'green'
    } else if (score >= 60) {
      label = 'Tốt'
      color = 'green'
    } else if (score >= 40) {
      label = 'Trung bình'
      color = 'yellow'
    } else {
      label = 'Cần cải thiện'
      color = 'red'
    }

    // Generate recommendations
    const recommendations: string[] = []
    if (ctr < 1) {
      recommendations.push('CTR thấp: Cân nhắc cải thiện creative hoặc targeting để tăng tỷ lệ nhấp')
    }
    if (cpc > 5000) {
      recommendations.push('CPC cao: Tối ưu hóa bid strategy hoặc cải thiện chất lượng quảng cáo')
    }
    if (results === 0 && campaign.objective.includes('PURCHASE')) {
      recommendations.push('Chưa có conversion: Kiểm tra lại pixel tracking và landing page')
    }
    if (campaign.frequency && campaign.frequency > 3) {
      recommendations.push('Frequency cao: Cân nhắc refresh creative để tránh ad fatigue')
    }
    if (impressions > 0 && clicks === 0) {
      recommendations.push('Không có click: Cần review lại creative và targeting')
    }

    // Generate trends
    const trends: string[] = []
    if (ctr > 2) trends.push('CTR đang ở mức tốt')
    if (cpc < 2000) trends.push('CPC đang ở mức hợp lý')
    if (results > 0) trends.push(`Đã đạt được ${results} kết quả`)

    // Generate alerts
    const alerts: string[] = []
    if (campaign.status !== 'ACTIVE') {
      alerts.push(`Chiến dịch đang ở trạng thái: ${campaign.status}`)
    }
    if (spend > 0 && results === 0 && campaign.objective.includes('PURCHASE')) {
      alerts.push('Đã chi tiêu nhưng chưa có conversion')
    }

    const summary = `Chiến dịch "${campaign.name}" đang ${campaign.status === 'ACTIVE' ? 'hoạt động' : 'tạm dừng'}. 
    Với ${formatNumber(impressions)} lượt hiển thị và ${formatNumber(clicks)} lượt nhấp, 
    CTR đạt ${ctr.toFixed(2)}%. ${results > 0 ? `Đã đạt được ${results} kết quả.` : 'Chưa có kết quả.'}`

    setAiInsights({
      summary,
      recommendations,
      performance: { score, label, color },
      trends,
      alerts
    })
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800'
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPerformanceColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!isOpen || !campaign) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Offcanvas */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[960px] lg:w-[1250px] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } overflow-y-auto`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900">Chi tiết chiến dịch</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Đóng"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Campaign Info */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1.5">{campaign.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status === 'ACTIVE' ? 'Đang chạy' : campaign.status === 'PAUSED' ? 'Tạm dừng' : campaign.status}
                    </span>
                    <span className="text-xs text-gray-500">ID: {campaign.id}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-xs">
                  <Tooltip text="<strong>Mục tiêu (Objective)</strong><br/>Mục tiêu chính của chiến dịch quảng cáo. Ví dụ: Tương tác, Bán hàng, Lượt truy cập, v.v.">
                    <div>
                      <div className="flex items-center space-x-1 mb-0.5">
                        <p className="text-gray-500">Mục tiêu</p>
                        <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                      </div>
                      <p className="font-medium text-gray-900 text-xs">{getObjectiveLabel(campaign.objective)}</p>
                    </div>
                  </Tooltip>
                  <Tooltip text="<strong>Ngân sách/ngày (Daily Budget)</strong><br/>Số tiền tối đa bạn muốn chi tiêu mỗi ngày cho chiến dịch này. Facebook sẽ cố gắng phân bổ ngân sách đều trong ngày.">
                    <div>
                      <div className="flex items-center space-x-1 mb-0.5">
                        <p className="text-gray-500">Ngân sách/ngày</p>
                        <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                      </div>
                      <p className="font-medium text-gray-900 text-xs">
                        {campaign.daily_budget ? formatCurrency(campaign.daily_budget) : 'N/A'}
                      </p>
                    </div>
                  </Tooltip>
                  <Tooltip text="<strong>Ngày tạo (Created Date)</strong><br/>Ngày và giờ chiến dịch được tạo lần đầu tiên.">
                    <div>
                      <div className="flex items-center space-x-1 mb-0.5">
                        <p className="text-gray-500">Ngày tạo</p>
                        <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                      </div>
                      <p className="font-medium text-gray-900 text-xs">{formatDate(campaign.created_time)}</p>
                    </div>
                  </Tooltip>
                  <Tooltip text="<strong>Cập nhật lần cuối (Last Updated)</strong><br/>Ngày và giờ chiến dịch được chỉnh sửa hoặc cập nhật lần cuối cùng.">
                    <div>
                      <div className="flex items-center space-x-1 mb-0.5">
                        <p className="text-gray-500">Cập nhật lần cuối</p>
                        <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                      </div>
                      <p className="font-medium text-gray-900 text-xs">{formatDate(campaign.updated_time)}</p>
                    </div>
                  </Tooltip>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Chỉ số chính</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <Tooltip text="<strong>Lượt hiển thị (Impressions)</strong><br/>Số lần quảng cáo được hiển thị cho người dùng. Mỗi lần quảng cáo xuất hiện trên màn hình được tính là 1 lượt hiển thị.">
                      <div className="flex items-center space-x-1.5 mb-1.5 cursor-help">
                        <Eye className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-gray-600">Lượt hiển thị</p>
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </div>
                    </Tooltip>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(campaign.impressions)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <Tooltip text="<strong>Lượt nhấp (Clicks)</strong><br/>Số lần người dùng nhấp vào quảng cáo. Chỉ số này cho biết mức độ tương tác của người dùng với quảng cáo.">
                      <div className="flex items-center space-x-1.5 mb-1.5 cursor-help">
                        <MousePointerClick className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-gray-600">Lượt nhấp</p>
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </div>
                    </Tooltip>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(campaign.clicks)}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <Tooltip text="<strong>Đã chi tiêu (Spend)</strong><br/>Tổng số tiền đã chi cho chiến dịch trong khoảng thời gian được chọn. Bao gồm tất cả các chi phí quảng cáo.">
                      <div className="flex items-center space-x-1.5 mb-1.5 cursor-help">
                        <DollarSign className="h-4 w-4 text-yellow-600" />
                        <p className="text-xs text-gray-600">Đã chi tiêu</p>
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </div>
                    </Tooltip>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(campaign.spend)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <Tooltip text="<strong>CTR (Click-Through Rate)</strong><br/>Tỷ lệ nhấp = (Số lượt nhấp / Số lượt hiển thị) × 100%<br/>Chỉ số này cho biết mức độ hấp dẫn của quảng cáo. CTR cao cho thấy quảng cáo hiệu quả.">
                      <div className="flex items-center space-x-1.5 mb-1.5 cursor-help">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <p className="text-xs text-gray-600">CTR</p>
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </div>
                    </Tooltip>
                    <p className="text-lg font-bold text-gray-900">{(campaign.ctr || 0).toFixed(2)}%</p>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              {details?.insights && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Chỉ số hiệu suất</h3>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <Tooltip text="<strong>CPM (Cost Per Mille)</strong><br/>Chi phí trên mỗi 1.000 lượt hiển thị.<br/>CPM = (Tổng chi tiêu / Số lượt hiển thị) × 1.000<br/>Chỉ số này giúp đánh giá hiệu quả chi phí quảng cáo.">
                      <div>
                        <div className="flex items-center space-x-1 mb-0.5">
                          <p className="text-gray-500">CPM</p>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </div>
                        <p className="font-semibold text-gray-900">{formatCurrency(campaign.cpm || 0)}</p>
                      </div>
                    </Tooltip>
                    <Tooltip text="<strong>CPC (Cost Per Click)</strong><br/>Chi phí trên mỗi lượt nhấp.<br/>CPC = Tổng chi tiêu / Số lượt nhấp<br/>Chỉ số này cho biết chi phí trung bình để có được một lượt nhấp.">
                      <div>
                        <div className="flex items-center space-x-1 mb-0.5">
                          <p className="text-gray-500">CPC</p>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </div>
                        <p className="font-semibold text-gray-900">{formatCurrency(campaign.cpc || 0)}</p>
                      </div>
                    </Tooltip>
                    <Tooltip text="<strong>Reach (Tiếp cận)</strong><br/>Số lượng người dùng duy nhất đã xem quảng cáo ít nhất một lần. Khác với Impressions, Reach chỉ đếm mỗi người một lần.">
                      <div>
                        <div className="flex items-center space-x-1 mb-0.5">
                          <p className="text-gray-500">Reach</p>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </div>
                        <p className="font-semibold text-gray-900">{formatNumber(campaign.reach || 0)}</p>
                      </div>
                    </Tooltip>
                    <Tooltip text="<strong>Frequency (Tần suất)</strong><br/>Số lần trung bình một người dùng đã xem quảng cáo.<br/>Frequency = Impressions / Reach<br/>Frequency cao có thể dẫn đến ad fatigue (mệt mỏi quảng cáo).">
                      <div>
                        <div className="flex items-center space-x-1 mb-0.5">
                          <p className="text-gray-500">Frequency</p>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </div>
                        <p className="font-semibold text-gray-900">{(campaign.frequency || 0).toFixed(2)}</p>
                      </div>
                    </Tooltip>
                    {campaign.results !== undefined && (
                      <>
                        <Tooltip text="<strong>Kết quả (Results)</strong><br/>Số lượng hành động mong muốn đã đạt được (ví dụ: mua hàng, đăng ký, liên hệ). Tùy thuộc vào mục tiêu của chiến dịch.">
                          <div>
                            <div className="flex items-center space-x-1 mb-0.5">
                              <p className="text-gray-500">Kết quả</p>
                              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                            </div>
                            <p className="font-semibold text-gray-900">{formatNumber(campaign.results)}</p>
                          </div>
                        </Tooltip>
                        {campaign.results > 0 && (
                          <Tooltip text="<strong>CPR (Cost Per Result)</strong><br/>Chi phí trên mỗi kết quả đạt được.<br/>CPR = Tổng chi tiêu / Số kết quả<br/>Chỉ số này cho biết chi phí trung bình để có được một kết quả mong muốn.">
                            <div>
                              <div className="flex items-center space-x-1 mb-0.5">
                                <p className="text-gray-500">CPR</p>
                                <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                              </div>
                              <p className="font-semibold text-gray-900">
                                {formatCurrency((campaign.spend || 0) / campaign.results)}
                              </p>
                            </div>
                          </Tooltip>
                        )}
                      </>
                    )}
                    {campaign.messages !== undefined && (
                      <Tooltip text="<strong>Người liên hệ (Messages)</strong><br/>Tổng số lượng người đã liên hệ nhắn tin thông qua quảng cáo. Chỉ số này quan trọng cho các chiến dịch tương tác và hỗ trợ khách hàng.">
                        <div>
                          <div className="flex items-center space-x-1 mb-0.5">
                            <p className="text-gray-500">Người liên hệ</p>
                            <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                          </div>
                          <p className="font-semibold text-gray-900">{formatNumber(campaign.messages)}</p>
                        </div>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}

              {/* Advanced Metrics for Experts */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Award className="h-4 w-4 mr-2 text-primary-600" />
                  Chỉ số chuyên sâu
                </h3>
                <div className="grid grid-cols-4 gap-3 text-xs">
                  {/* Conversion Rate */}
                  {campaign.clicks > 0 && (
                    <Tooltip text="<strong>Tỷ lệ chuyển đổi (Conversion Rate)</strong><br/>Tỷ lệ phần trăm người nhấp vào quảng cáo và thực hiện hành động mong muốn.<br/>Conversion Rate = (Kết quả / Lượt nhấp) × 100%">
                      <div>
                        <div className="flex items-center space-x-1 mb-0.5">
                          <p className="text-gray-500">Conversion Rate</p>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </div>
                        <p className="font-semibold text-gray-900">
                          {campaign.results && campaign.results > 0
                            ? ((campaign.results / campaign.clicks) * 100).toFixed(2) + '%'
                            : '0%'}
                        </p>
                      </div>
                    </Tooltip>
                  )}
                  
                  {/* Engagement Rate */}
                  {campaign.impressions > 0 && (
                    <Tooltip text="<strong>Tỷ lệ tương tác (Engagement Rate)</strong><br/>Tỷ lệ phần trăm người tương tác với quảng cáo.<br/>Engagement Rate = ((Clicks + Messages) / Impressions) × 100%">
                      <div>
                        <div className="flex items-center space-x-1 mb-0.5">
                          <p className="text-gray-500">Engagement Rate</p>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </div>
                        <p className="font-semibold text-gray-900">
                          {((campaign.clicks + (campaign.messages || 0)) / campaign.impressions * 100).toFixed(2)}%
                        </p>
                      </div>
                    </Tooltip>
                  )}

                  {/* ROAS (if we had revenue data, for now show estimated) */}
                  {campaign.results && campaign.results > 0 && (
                    <Tooltip text="<strong>ROAS (Return on Ad Spend)</strong><br/>Tỷ lệ doanh thu trên chi phí quảng cáo. Chỉ số này cho biết hiệu quả đầu tư quảng cáo.<br/>ROAS = Doanh thu / Chi phí quảng cáo<br/>ROAS > 1 nghĩa là có lợi nhuận.">
                      <div>
                        <div className="flex items-center space-x-1 mb-0.5">
                          <p className="text-gray-500">ROAS (Est.)</p>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </div>
                        <p className="font-semibold text-gray-900">
                          {/* Estimate: assume average order value, for real ROAS need revenue data */}
                          {campaign.spend > 0 ? (campaign.results * 500000 / campaign.spend).toFixed(2) : '0.00'}x
                        </p>
                      </div>
                    </Tooltip>
                  )}

                  {/* Cost per Engagement */}
                  <Tooltip text="<strong>Chi phí mỗi tương tác (Cost per Engagement)</strong><br/>Chi phí trung bình để có được một tương tác (click hoặc message).<br/>CPE = Chi tiêu / (Clicks + Messages)">
                    <div>
                      <div className="flex items-center space-x-1 mb-0.5">
                        <p className="text-gray-500">CPE</p>
                        <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                      </div>
                      <p className="font-semibold text-gray-900">
                        {campaign.clicks + (campaign.messages || 0) > 0
                          ? formatCurrency(campaign.spend / (campaign.clicks + (campaign.messages || 0)))
                          : formatCurrency(0)}
                      </p>
                    </div>
                  </Tooltip>

                  {/* Impressions per Result */}
                  {campaign.results && campaign.results > 0 && (
                    <Tooltip text="<strong>Lượt hiển thị mỗi kết quả (Impressions per Result)</strong><br/>Số lượt hiển thị trung bình cần thiết để có được một kết quả.<br/>IPR = Impressions / Results">
                      <div>
                        <div className="flex items-center space-x-1 mb-0.5">
                          <p className="text-gray-500">IPR</p>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatNumber(Math.round(campaign.impressions / campaign.results))}
                        </p>
                      </div>
                    </Tooltip>
                  )}

                  {/* Click-to-Conversion Rate */}
                  {campaign.clicks > 0 && campaign.results && campaign.results > 0 && (
                    <Tooltip text="<strong>Tỷ lệ nhấp-chuyển đổi (Click-to-Conversion Rate)</strong><br/>Tỷ lệ phần trăm người nhấp vào quảng cáo và thực hiện chuyển đổi.<br/>CTCR = (Results / Clicks) × 100%">
                      <div>
                        <div className="flex items-center space-x-1 mb-0.5">
                          <p className="text-gray-500">CTCR</p>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </div>
                        <p className="font-semibold text-gray-900">
                          {((campaign.results / campaign.clicks) * 100).toFixed(2)}%
                        </p>
                      </div>
                    </Tooltip>
                  )}

                  {/* Ad Quality Score (estimated) */}
                  <Tooltip text="<strong>Điểm chất lượng quảng cáo (Ad Quality Score)</strong><br/>Điểm đánh giá chất lượng quảng cáo dựa trên CTR, Engagement Rate và các yếu tố khác. Điểm cao hơn = quảng cáo tốt hơn.">
                    <div>
                      <div className="flex items-center space-x-1 mb-0.5">
                        <p className="text-gray-500">Quality Score</p>
                        <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                      </div>
                      <p className="font-semibold text-gray-900">
                        {(() => {
                          const ctrScore = Math.min((campaign.ctr || 0) * 10, 50)
                          const engagementScore = Math.min(((campaign.clicks + (campaign.messages || 0)) / campaign.impressions * 100) * 2, 30)
                          const resultsScore = campaign.results && campaign.results > 0 ? 20 : 0
                          return Math.round(ctrScore + engagementScore + resultsScore)
                        })()}/100
                      </p>
                    </div>
                  </Tooltip>

                  {/* Budget Utilization */}
                  {campaign.daily_budget && (
                    <Tooltip text="<strong>Tỷ lệ sử dụng ngân sách (Budget Utilization)</strong><br/>Tỷ lệ phần trăm ngân sách đã được sử dụng so với ngân sách hàng ngày.<br/>Budget Utilization = (Spend / Daily Budget) × 100%">
                      <div>
                        <div className="flex items-center space-x-1 mb-0.5">
                          <p className="text-gray-500">Budget Usage</p>
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                        </div>
                        <p className="font-semibold text-gray-900">
                          {(() => {
                            const budget = typeof campaign.daily_budget === 'string' 
                              ? parseFloat(campaign.daily_budget) 
                              : (campaign.daily_budget || 0)
                            return budget > 0 ? ((campaign.spend / budget) * 100).toFixed(1) + '%' : 'N/A'
                          })()}
                        </p>
                      </div>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Charts Section */}
              {details?.timeSeries && details.timeSeries.length > 0 && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2 text-primary-600" />
                    Biểu đồ phân tích
                  </h3>
                  
                  {/* Prepare chart data */}
                  {(() => {
                    const chartData = details.timeSeries.map((item: any) => {
                      const date = new Date(item.date_start)
                      const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()]
                      const dayMonth = `${date.getDate()}/${date.getMonth() + 1}`
                      
                      // Parse results from actions if available
                      let results = item.results || 0
                      if (!results && item.actions && Array.isArray(item.actions)) {
                        // Try to find purchase actions (same logic as backend)
                        const purchaseActionTypes = [
                          'onsite_conversion.purchase',
                          'onsite_web_purchase',
                          'onsite_app_purchase',
                          'offsite_conversion.fb_pixel_purchase',
                          'omni_purchase',
                          'onsite_conversion.meta_purchase',
                          'purchase'
                        ]
                        
                        for (const purchaseType of purchaseActionTypes) {
                          const action = item.actions.find((a: any) => {
                            if (!a || !a.action_type) return false
                            const actionType = String(a.action_type).toLowerCase()
                            return actionType === purchaseType.toLowerCase()
                          })
                          
                          if (action && action.value !== null && action.value !== undefined) {
                            if (typeof action.value === 'string') {
                              results = parseInt(action.value, 10) || 0
                            } else if (typeof action.value === 'number') {
                              results = action.value
                            }
                            break
                          }
                        }
                      }
                      
                      return {
                        name: `${dayName} ${dayMonth}`,
                        date: item.date_start,
                        impressions: item.impressions || 0,
                        clicks: item.clicks || 0,
                        spend: item.spend || 0,
                        reach: item.reach || 0,
                        ctr: item.ctr ? parseFloat(item.ctr.toString()) : 0,
                        cpc: item.cpc ? parseFloat(item.cpc.toString()) : 0,
                        cpm: item.cpm ? parseFloat(item.cpm.toString()) : 0,
                        results: results,
                      }
                    })

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Impressions, Clicks & Results Chart */}
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">Lượt hiển thị, Lượt nhấp & Kết quả</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                              <RechartsTooltip />
                              <Legend wrapperStyle={{ fontSize: '10px' }} />
                              <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#3b82f6" name="Lượt hiển thị" strokeWidth={2} />
                              <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#10b981" name="Lượt nhấp" strokeWidth={2} />
                              <Line yAxisId="right" type="monotone" dataKey="results" stroke="#ef4444" name="Kết quả" strokeWidth={2} strokeDasharray="5 5" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Spend Chart */}
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">Chi tiêu theo ngày</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <RechartsTooltip formatter={(value: any) => formatCurrency(value)} />
                              <Legend wrapperStyle={{ fontSize: '10px' }} />
                              <Area type="monotone" dataKey="spend" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Chi tiêu" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {/* CTR & CPC Chart */}
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">CTR & CPC</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <ComposedChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                              <RechartsTooltip />
                              <Legend wrapperStyle={{ fontSize: '10px' }} />
                              <Bar yAxisId="left" dataKey="ctr" fill="#8b5cf6" name="CTR (%)" />
                              <Line yAxisId="right" type="monotone" dataKey="cpc" stroke="#ef4444" name="CPC (₫)" strokeWidth={2} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Results Chart */}
                        {chartData.some((d: any) => d.results > 0) && (
                          <div className="bg-white border border-gray-200 rounded-lg p-3">
                            <h4 className="text-xs font-semibold text-gray-900 mb-2">Kết quả theo ngày</h4>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <RechartsTooltip />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <Bar dataKey="results" fill="#10b981" name="Kết quả" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* AI Insights */}
              {aiInsights && (
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex items-center space-x-2 mb-3">
                    <Sparkles className="h-4 w-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Phân tích AI</h3>
                  </div>

                  {/* Performance Score */}
                  <div className={`border-2 rounded-lg p-3 ${getPerformanceColor(aiInsights.performance.color)}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold">Điểm đánh giá</span>
                      <span className="text-lg font-bold">{aiInsights.performance.score}/100</span>
                    </div>
                    <p className="text-xs mb-2">{aiInsights.performance.label}</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          aiInsights.performance.color === 'green' ? 'bg-green-600' :
                          aiInsights.performance.color === 'yellow' ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${aiInsights.performance.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-700 leading-relaxed">{aiInsights.summary}</p>
                  </div>

                  {/* Trends */}
                  {aiInsights.trends.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1.5 flex items-center">
                        <TrendingUp className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                        Xu hướng tích cực
                      </h4>
                      <ul className="space-y-1.5">
                        {aiInsights.trends.map((trend, index) => (
                          <li key={index} className="flex items-start text-xs text-gray-700">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{trend}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {aiInsights.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1.5 flex items-center">
                        <Target className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                        Khuyến nghị
                      </h4>
                      <ul className="space-y-1.5">
                        {aiInsights.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start text-xs text-gray-700">
                            <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Alerts */}
                  {aiInsights.alerts.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1.5 flex items-center">
                        <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-yellow-600" />
                        Cảnh báo
                      </h4>
                      <ul className="space-y-1.5">
                        {aiInsights.alerts.map((alert, index) => (
                          <li key={index} className="flex items-start text-xs text-yellow-700">
                            <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <span>{alert}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default CampaignDetailOffcanvas

