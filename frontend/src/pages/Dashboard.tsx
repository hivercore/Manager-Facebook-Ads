import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  DollarSign, 
  TrendingUp, 
  Eye, 
  MousePointerClick,
  Users,
  ArrowRight
} from 'lucide-react'
import { api } from '../services/api'
import StatCard from '../components/StatCard'
import AccountSelector from '../components/AccountSelector'

interface DashboardStats {
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalAccounts: number
  ctr: number
  cpm: number
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalAccounts: 0,
    ctr: 0,
    cpm: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [selectedAccountId])

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      // Get accounts first
      const accountsRes = await api.get('/accounts')
      const accounts = accountsRes.data
      
      if (accounts.length === 0) {
        setStats({
          totalAccounts: 0,
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          ctr: 0,
          cpm: 0
        })
        setLoading(false)
        return
      }

      // If account selected, get insights for that account only
      if (selectedAccountId) {
        try {
          const insightsRes = await api.get('/insights', {
            params: { accountId: selectedAccountId, datePreset: 'last_7d' }
          })
          const insights = insightsRes.data
          
          setStats({
            totalAccounts: accounts.length,
            totalSpend: parseFloat(insights.spend || '0'),
            totalImpressions: parseInt(insights.impressions || '0'),
            totalClicks: parseInt(insights.clicks || '0'),
            ctr: parseFloat(insights.ctr || '0'),
            cpm: parseFloat(insights.cpm || '0')
          })
        } catch (error) {
          console.error('Error fetching insights:', error)
          setStats({
            totalAccounts: accounts.length,
            totalSpend: 0,
            totalImpressions: 0,
            totalClicks: 0,
            ctr: 0,
            cpm: 0
          })
        }
      } else {
        // Get aggregated insights from all accounts
        const insightsRes = await api.get('/insights', {
          params: { datePreset: 'last_7d' }
        })
        const insights = insightsRes.data
        
        setStats({
          totalAccounts: accounts.length,
          totalSpend: parseFloat(insights.spend || '0'),
          totalImpressions: parseInt(insights.impressions || '0'),
          totalClicks: parseInt(insights.clicks || '0'),
          ctr: parseFloat(insights.ctr || '0'),
          cpm: parseFloat(insights.cpm || '0')
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Tổng quan về tài khoản quảng cáo của bạn</p>
        </div>
        <div className="w-full sm:w-auto">
          <AccountSelector
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
          />
        </div>
      </div>

      {stats.totalAccounts === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có tài khoản</h3>
          <p className="mt-1 text-sm text-gray-500">Thêm tài khoản quảng cáo để bắt đầu.</p>
          <Link
            to="/accounts"
            className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Thêm tài khoản
          </Link>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              title="Tổng chi tiêu"
              value={formatCurrency(stats.totalSpend)}
              icon={DollarSign}
            />
            <StatCard
              title="Lượt hiển thị"
              value={formatNumber(stats.totalImpressions)}
              icon={Eye}
            />
            <StatCard
              title="Lượt nhấp"
              value={formatNumber(stats.totalClicks)}
              icon={MousePointerClick}
            />
            <StatCard
              title="Tài khoản"
              value={stats.totalAccounts.toString()}
              icon={Users}
            />
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hiệu suất</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">CTR (Tỷ lệ nhấp)</span>
                  <span className="text-2xl font-bold text-primary-600">{stats.ctr.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">CPM (Chi phí/1000 hiển thị)</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {formatCurrency(stats.cpm)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hành động nhanh</h3>
              <div className="space-y-3">
                <Link
                  to="/accounts"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-gray-700">Quản lý tài khoản</span>
                  <ArrowRight size={20} className="text-gray-400 group-hover:text-primary-600" />
                </Link>
                <Link
                  to="/campaigns"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-gray-700">Xem chiến dịch</span>
                  <ArrowRight size={20} className="text-gray-400 group-hover:text-primary-600" />
                </Link>
                <Link
                  to="/analytics"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-gray-700">Phân tích chi tiết</span>
                  <ArrowRight size={20} className="text-gray-400 group-hover:text-primary-600" />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
