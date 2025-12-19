import React, { useEffect, useState } from 'react'
import { FileText, Download, Calendar, TrendingUp, DollarSign, MousePointerClick, Eye, Users, BarChart3, RefreshCw } from 'lucide-react'
import { api } from '../services/api'
import AccountSelector from '../components/AccountSelector'

interface ReportData {
  date: string
  impressions: number
  clicks: number
  spend: number
  results: number
  reach?: number
  cpm?: number
  cpc?: number
  ctr?: number
  messages?: number
}

const Reports = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<string>('today')
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [summary, setSummary] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    totalSpend: 0,
    totalResults: 0,
    totalReach: 0,
    totalMessages: 0,
    avgCPM: 0,
    avgCPC: 0,
    avgCTR: 0,
  })

  useEffect(() => {
    if (selectedAccountId) {
      fetchReport()
    } else {
      setReportData([])
      setSummary({
        totalImpressions: 0,
        totalClicks: 0,
        totalSpend: 0,
        totalResults: 0,
        totalReach: 0,
        totalMessages: 0,
        avgCPM: 0,
        avgCPC: 0,
        avgCTR: 0,
      })
    }
  }, [selectedAccountId, datePreset])

  const fetchReport = async () => {
    if (!selectedAccountId) return

    try {
      setLoading(true)
      setError(null)

      const params: any = {
        accountId: selectedAccountId,
        datePreset: datePreset,
      }

      // Fetch campaigns data instead of insights to match Campaigns page
      const response = await api.get('/campaigns', { params })
      const campaigns = response.data || []

      // Calculate totals from campaigns (same logic as Campaigns page)
      const totals = campaigns.reduce((acc: any, campaign: any) => {
        acc.impressions += campaign.impressions || 0
        acc.clicks += campaign.clicks || 0
        acc.spend += campaign.spend || 0
        acc.results += campaign.results || 0
        acc.reach += campaign.reach || 0
        acc.messages += campaign.messages || 0
        return acc
      }, {
        impressions: 0,
        clicks: 0,
        spend: 0,
        results: 0,
        reach: 0,
        messages: 0,
      })

      // Calculate averages
      const avgCPC = totals.clicks > 0 ? totals.spend / totals.clicks : 0
      const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
      const avgCPM = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0

      setSummary({
        totalImpressions: totals.impressions,
        totalClicks: totals.clicks,
        totalSpend: totals.spend,
        totalResults: totals.results,
        totalReach: totals.reach,
        totalMessages: totals.messages,
        avgCPM: avgCPM,
        avgCPC: avgCPC,
        avgCTR: avgCTR,
      })

      // For now, create a single summary row
      // In the future, this can be expanded to show daily breakdown
      setReportData([{
        date: datePreset,
        impressions: totals.impressions,
        clicks: totals.clicks,
        spend: totals.spend,
        results: totals.results,
        reach: totals.reach,
        cpm: avgCPM,
        cpc: avgCPC,
        ctr: avgCTR,
        messages: totals.messages,
      }])
    } catch (err: any) {
      console.error('Error fetching report:', err)
      setError(err.response?.data?.error || 'Không thể tải báo cáo. Vui lòng thử lại.')
      setReportData([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value)
  }

  const exportReport = () => {
    // Create CSV content
    const headers = ['Ngày', 'Lượt hiển thị', 'Lượt nhấp', 'Chi tiêu', 'Kết quả', 'Tiếp cận', 'CPM', 'CPC', 'CTR', 'Người liên hệ']
    const rows = reportData.map(row => [
      row.date,
      row.impressions.toString(),
      row.clicks.toString(),
      row.spend.toString(),
      row.results.toString(),
      (row.reach || 0).toString(),
      (row.cpm || 0).toString(),
      (row.cpc || 0).toString(),
      (row.ctr ? row.ctr.toFixed(2) + '%' : '0%'),
      (row.messages || 0).toString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Create and download file
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `bao-cao-${datePreset}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Báo cáo</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Xem và xuất báo cáo hiệu suất quảng cáo</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <AccountSelector
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            showAllOption={false}
          />
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
            onClick={fetchReport}
            disabled={loading || !selectedAccountId}
            className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
            <span>Làm mới</span>
          </button>
          {reportData.length > 0 && (
            <button
              onClick={exportReport}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Download size={18} />
              <span>Xuất CSV</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Lỗi</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {!selectedAccountId ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chọn tài khoản</h3>
          <p className="text-gray-500">Vui lòng chọn tài khoản để xem báo cáo.</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải báo cáo...</p>
        </div>
      ) : reportData.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Không có dữ liệu</h3>
          <p className="text-gray-500">Không tìm thấy dữ liệu cho khoảng thời gian đã chọn.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tổng lượt hiển thị</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalImpressions)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tổng lượt nhấp</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalClicks)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <MousePointerClick className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tổng chi tiêu</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalSpend)}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tổng kết quả</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalResults)}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-700">CPM (Chi phí/1000 lượt hiển thị)</p>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.avgCPM)}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-700">CPC (Chi phí/lượt nhấp)</p>
                <MousePointerClick className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.avgCPC)}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-700">CTR (Tỷ lệ nhấp)</p>
                <TrendingUp className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{summary.avgCTR.toFixed(2)}%</p>
            </div>
          </div>

          {/* Report Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Chi tiết báo cáo</h2>
              <button
                onClick={exportReport}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Download size={16} />
                <span>Xuất CSV</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lượt hiển thị</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lượt nhấp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chi tiêu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kết quả</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiếp cận</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPM</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người liên hệ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(row.impressions)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(row.clicks)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{formatCurrency(row.spend)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">{formatNumber(row.results)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(row.reach || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.cpm || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(row.cpc || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.ctr ? row.ctr.toFixed(2) + '%' : '0%'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(row.messages || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Reports

