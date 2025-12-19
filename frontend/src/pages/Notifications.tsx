import React, { useEffect, useState } from 'react'
import { Bell, Send, Eye, RefreshCw, X, AlertCircle, CheckCircle, Clock, Save } from 'lucide-react'
import { api } from '../services/api'
import AccountSelector from '../components/AccountSelector'

interface MetricConfig {
  enabled: boolean
  threshold: number
}

interface MetricsConfig {
  spend: MetricConfig
  impressions: MetricConfig
  clicks: MetricConfig
  results: MetricConfig
  ctr: MetricConfig
  cpc: MetricConfig
  cpm: MetricConfig
  reach: MetricConfig
  messages: MetricConfig
}

const Notifications = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [autoSendEnabled, setAutoSendEnabled] = useState(false)
  const [scheduleType, setScheduleType] = useState<'interval' | 'scheduled'>('interval')
  const [intervalMinutes, setIntervalMinutes] = useState<number>(60)
  const [scheduledTime, setScheduledTime] = useState<string>('09:00')
  const [saved, setSaved] = useState(false)
  
  const [metrics, setMetrics] = useState<MetricsConfig>({
    spend: { enabled: false, threshold: 0 },
    impressions: { enabled: false, threshold: 0 },
    clicks: { enabled: false, threshold: 0 },
    results: { enabled: false, threshold: 0 },
    ctr: { enabled: false, threshold: 0 },
    cpc: { enabled: false, threshold: 0 },
    cpm: { enabled: false, threshold: 0 },
    reach: { enabled: false, threshold: 0 },
    messages: { enabled: false, threshold: 0 },
  })

  useEffect(() => {
    // Load saved settings
    const savedSettings = localStorage.getItem('notificationSettings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setAutoSendEnabled(parsed.autoSendEnabled || false)
        setScheduleType(parsed.scheduleType || 'interval')
        setIntervalMinutes(parsed.intervalMinutes || 60)
        setScheduledTime(parsed.scheduledTime || '09:00')
        setSelectedAccountId(parsed.selectedAccountId || null)
        if (parsed.selectedCampaignIds) {
          setSelectedCampaignIds(new Set(parsed.selectedCampaignIds))
        }
        if (parsed.metrics) {
          setMetrics(parsed.metrics)
        }
      } catch (err) {
        console.error('Error loading notification settings:', err)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedAccountId) {
      fetchCampaigns()
    } else {
      setCampaigns([])
      setSelectedCampaignIds(new Set())
    }
  }, [selectedAccountId])

  const fetchCampaigns = async () => {
    if (!selectedAccountId) return

    try {
      setLoadingCampaigns(true)
      setError(null)
      const response = await api.get('/campaigns', {
        params: {
          accountId: selectedAccountId,
          datePreset: 'today',
        },
      })
      setCampaigns(response.data || [])
    } catch (err: any) {
      console.error('Error fetching campaigns:', err)
      setError('Không thể tải danh sách chiến dịch: ' + (err.response?.data?.error || err.message))
      setCampaigns([])
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const handleCampaignToggle = (campaignId: string) => {
    const newSelected = new Set(selectedCampaignIds)
    if (newSelected.has(campaignId)) {
      newSelected.delete(campaignId)
    } else {
      newSelected.add(campaignId)
    }
    setSelectedCampaignIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedCampaignIds.size === campaigns.length) {
      setSelectedCampaignIds(new Set())
    } else {
      setSelectedCampaignIds(new Set(campaigns.map((c: any) => c.id)))
    }
  }

  const handleMetricChange = (metricKey: keyof MetricsConfig, field: 'enabled' | 'threshold', value: boolean | number) => {
    setMetrics((prev) => ({
      ...prev,
      [metricKey]: {
        ...prev[metricKey],
        [field]: value,
      },
    }))
  }

  const getSettings = () => {
    try {
      const saved = localStorage.getItem('appSettings')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    }
    return null
  }

  const generateReport = (campaignsData: any[]) => {
    const lines: string[] = []
    lines.push('📊 BÁO CÁO CHIẾN DỊCH')
    lines.push(`Tài khoản: ${selectedAccountId}`)
    lines.push(`Thời gian: ${new Date().toLocaleString('vi-VN')}`)
    lines.push(`Chiến dịch: ${campaignsData.length}`)
    lines.push('--------------------------')

    campaignsData.forEach((c: any, idx: number) => {
      const ctr = c.impressions > 0 ? ((c.clicks || 0) / c.impressions) * 100 : 0
      const cpc = c.clicks > 0 ? (c.spend || 0) / c.clicks : 0
      const cpm = c.impressions > 0 ? ((c.spend || 0) / c.impressions) * 1000 : 0

      lines.push(`${idx + 1}. ${c.name || c.id}`)
      lines.push(`   ID: ${c.id}`)
      lines.push(`   Trạng thái: ${c.effective_status || c.status || '-'}`)
      
      if (metrics.spend.enabled) {
        const spend = c.spend || 0
        const alert = spend >= metrics.spend.threshold ? ' ⚠️' : ''
        lines.push(`   💰 Chi tiêu: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(spend)}${alert}`)
      }
      
      if (metrics.impressions.enabled) {
        const impressions = c.impressions || 0
        const alert = impressions >= metrics.impressions.threshold ? ' ⚠️' : ''
        lines.push(`   👁️ Hiển thị: ${new Intl.NumberFormat('vi-VN').format(impressions)}${alert}`)
      }
      
      if (metrics.clicks.enabled) {
        const clicks = c.clicks || 0
        const alert = clicks >= metrics.clicks.threshold ? ' ⚠️' : ''
        lines.push(`   🖱️ Nhấp: ${new Intl.NumberFormat('vi-VN').format(clicks)}${alert}`)
      }
      
      if (metrics.results.enabled) {
        const results = c.results || 0
        const alert = results >= metrics.results.threshold ? ' ⚠️' : ''
        lines.push(`   ✅ Kết quả: ${new Intl.NumberFormat('vi-VN').format(results)}${alert}`)
      }
      
      if (metrics.ctr.enabled) {
        const alert = ctr >= metrics.ctr.threshold ? ' ⚠️' : ''
        lines.push(`   📈 CTR: ${ctr.toFixed(2)}%${alert}`)
      }
      
      if (metrics.cpc.enabled) {
        const alert = cpc >= metrics.cpc.threshold ? ' ⚠️' : ''
        lines.push(`   💵 CPC: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(cpc)}${alert}`)
      }
      
      if (metrics.cpm.enabled) {
        const alert = cpm >= metrics.cpm.threshold ? ' ⚠️' : ''
        lines.push(`   💸 CPM: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(cpm)}${alert}`)
      }
      
      if (metrics.reach.enabled) {
        const reach = c.reach || 0
        const alert = reach >= metrics.reach.threshold ? ' ⚠️' : ''
        lines.push(`   👥 Phạm vi: ${new Intl.NumberFormat('vi-VN').format(reach)}${alert}`)
      }
      
      if (metrics.messages.enabled) {
        const messages = c.messages || 0
        const alert = messages >= metrics.messages.threshold ? ' ⚠️' : ''
        lines.push(`   💬 Tin nhắn: ${new Intl.NumberFormat('vi-VN').format(messages)}${alert}`)
      }

      lines.push('')
    })

    return lines.join('\n')
  }

  const handlePreview = async () => {
    if (!selectedAccountId || selectedCampaignIds.size === 0) {
      setError('Vui lòng chọn Account và ít nhất một chiến dịch')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/campaigns', {
        params: {
          accountId: selectedAccountId,
          datePreset: 'today',
        },
      })

      const allCampaigns = response.data || []
      const filtered = allCampaigns.filter((c: any) => selectedCampaignIds.has(c.id))

      if (filtered.length === 0) {
        setError('Không tìm thấy chiến dịch đã chọn')
        return
      }

      const report = generateReport(filtered)
      setPreviewContent(report)
      setPreviewOpen(true)
    } catch (err: any) {
      setError('Không thể tạo preview: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = () => {
    try {
      const settings = {
        autoSendEnabled,
        scheduleType,
        intervalMinutes,
        scheduledTime,
        selectedAccountId,
        selectedCampaignIds: Array.from(selectedCampaignIds),
        metrics,
      }
      localStorage.setItem('notificationSettings', JSON.stringify(settings))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError('Không thể lưu cài đặt: ' + err.message)
    }
  }

  const sendReport = async () => {
    const settings = getSettings()
    if (!settings || !settings.telegramToken || !settings.telegramChatId) {
      console.error('Telegram not configured')
      return
    }

    if (!selectedAccountId || selectedCampaignIds.size === 0) {
      console.error('No account or campaigns selected')
      return
    }

    try {
      const response = await api.get('/campaigns', {
        params: {
          accountId: selectedAccountId,
          datePreset: 'today',
        },
      })

      const allCampaigns = response.data || []
      const filtered = allCampaigns.filter((c: any) => selectedCampaignIds.has(c.id))

      if (filtered.length === 0) {
        console.error('No campaigns found')
        return
      }

      const report = generateReport(filtered)

      await api.post('/telegram/report', {
        token: settings.telegramToken,
        chatId: settings.telegramChatId,
        title: '📢 Báo cáo chiến dịch tự động',
        message: report,
      })

      console.log('Auto report sent successfully')
    } catch (err: any) {
      console.error('Error sending auto report:', err)
    }
  }

  // Auto send based on schedule
  useEffect(() => {
    if (!autoSendEnabled || !selectedAccountId || selectedCampaignIds.size === 0) {
      return
    }

    let intervalId: NodeJS.Timeout | null = null
    let scheduledTimeout: NodeJS.Timeout | null = null

    if (scheduleType === 'interval') {
      // Send immediately, then every X minutes
      sendReport()
      intervalId = setInterval(() => {
        sendReport()
      }, intervalMinutes * 60 * 1000)
    } else if (scheduleType === 'scheduled') {
      // Calculate time until scheduled time
      const scheduleNextSend = () => {
        const now = new Date()
        const [hours, minutes] = scheduledTime.split(':').map(Number)
        const scheduled = new Date()
        scheduled.setHours(hours, minutes, 0, 0)

        // If scheduled time has passed today, schedule for tomorrow
        if (scheduled <= now) {
          scheduled.setDate(scheduled.getDate() + 1)
        }

        const msUntilScheduled = scheduled.getTime() - now.getTime()

        scheduledTimeout = setTimeout(() => {
          sendReport()
          // Schedule next day
          scheduleNextSend()
        }, msUntilScheduled)
      }

      scheduleNextSend()
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (scheduledTimeout) clearTimeout(scheduledTimeout)
    }
  }, [autoSendEnabled, scheduleType, intervalMinutes, scheduledTime, selectedAccountId, selectedCampaignIds, metrics])

  const handleSend = async () => {
    const settings = getSettings()
    if (!settings || !settings.telegramToken || !settings.telegramChatId) {
      setError('Vui lòng cấu hình Telegram Token và Chat ID trong trang Cài đặt trước')
      return
    }

    if (!selectedAccountId || selectedCampaignIds.size === 0) {
      setError('Vui lòng chọn Account và ít nhất một chiến dịch')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/campaigns', {
        params: {
          accountId: selectedAccountId,
          datePreset: 'today',
        },
      })

      const allCampaigns = response.data || []
      const filtered = allCampaigns.filter((c: any) => selectedCampaignIds.has(c.id))

      if (filtered.length === 0) {
        setError('Không tìm thấy chiến dịch đã chọn')
        return
      }

      const report = generateReport(filtered)

      await api.post('/telegram/report', {
        token: settings.telegramToken,
        chatId: settings.telegramChatId,
        title: '📢 Báo cáo chiến dịch',
        message: report,
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError('Không thể gửi báo cáo: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const metricLabels: Record<keyof MetricsConfig, { label: string; unit: string }> = {
    spend: { label: 'Chi tiêu', unit: '₫' },
    impressions: { label: 'Lượt hiển thị', unit: '' },
    clicks: { label: 'Lượt nhấp', unit: '' },
    results: { label: 'Kết quả', unit: '' },
    ctr: { label: 'CTR', unit: '%' },
    cpc: { label: 'CPC', unit: '₫' },
    cpm: { label: 'CPM', unit: '₫' },
    reach: { label: 'Phạm vi tiếp cận', unit: '' },
    messages: { label: 'Tin nhắn', unit: '' },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Thông báo</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Gửi báo cáo tùy chọn qua Telegram</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center space-x-2">
          <CheckCircle size={20} />
          <span>Đã gửi báo cáo thành công!</span>
        </div>
      )}

      {/* Account Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chọn tài khoản</h2>
        <AccountSelector
          selectedAccountId={selectedAccountId}
          onAccountChange={setSelectedAccountId}
          showAllOption={false}
        />
      </div>

      {/* Campaign Selection */}
      {selectedAccountId && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Chọn chiến dịch</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchCampaigns}
                disabled={loadingCampaigns}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={`inline mr-1 ${loadingCampaigns ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
              {campaigns.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  {selectedCampaignIds.size === campaigns.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              )}
            </div>
          </div>

          {loadingCampaigns ? (
            <div className="text-center py-4 text-gray-500">Đang tải danh sách chiến dịch...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Không có chiến dịch nào</div>
          ) : (
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              {campaigns.map((campaign: any) => (
                <div
                  key={campaign.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedCampaignIds.has(campaign.id)}
                    onChange={() => handleCampaignToggle(campaign.id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{campaign.name || campaign.id}</p>
                    <p className="text-xs text-gray-500">ID: {campaign.id}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedCampaignIds.size > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Đã chọn: {selectedCampaignIds.size} / {campaigns.length} chiến dịch
            </p>
          )}
        </div>
      )}

      {/* Metrics Configuration */}
      {selectedAccountId && selectedCampaignIds.size > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Chọn chỉ số và ngưỡng cảnh báo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(metrics) as Array<keyof MetricsConfig>).map((metricKey) => {
              const metric = metrics[metricKey]
              const label = metricLabels[metricKey]
              return (
                <div key={metricKey} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <input
                      type="checkbox"
                      checked={metric.enabled}
                      onChange={(e) => handleMetricChange(metricKey, 'enabled', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      {label.label}
                    </label>
                  </div>
                  {metric.enabled && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Ngưỡng cảnh báo ({label.unit})
                      </label>
                      <input
                        type="number"
                        value={metric.threshold || ''}
                        onChange={(e) => handleMetricChange(metricKey, 'threshold', parseFloat(e.target.value) || 0)}
                        placeholder="Nhập ngưỡng"
                        min="0"
                        step={metricKey === 'ctr' ? '0.01' : '1'}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Cảnh báo khi ≥ {metric.threshold} {label.unit}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Schedule Settings */}
      {selectedAccountId && selectedCampaignIds.size > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Cài đặt thời gian</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="autoSendEnabled"
                checked={autoSendEnabled}
                onChange={(e) => setAutoSendEnabled(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="autoSendEnabled" className="text-sm font-medium text-gray-700">
                Bật tự động gửi báo cáo
              </label>
            </div>

            {autoSendEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại lịch trình
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="scheduleType"
                        value="interval"
                        checked={scheduleType === 'interval'}
                        onChange={(e) => setScheduleType(e.target.value as 'interval' | 'scheduled')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Theo chu kỳ (phút)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="scheduleType"
                        value="scheduled"
                        checked={scheduleType === 'scheduled'}
                        onChange={(e) => setScheduleType(e.target.value as 'interval' | 'scheduled')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Hẹn giờ</span>
                    </label>
                  </div>
                </div>

                {scheduleType === 'interval' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gửi mỗi (phút)
                    </label>
                    <input
                      type="number"
                      value={intervalMinutes || ''}
                      onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 60)}
                      placeholder="Nhập số phút (ví dụ: 60)"
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Báo cáo sẽ được gửi tự động mỗi {intervalMinutes || 60} phút
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thời gian hẹn giờ
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Báo cáo sẽ được gửi tự động vào {scheduledTime} mỗi ngày
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {selectedAccountId && selectedCampaignIds.size > 0 && (
        <div className="flex justify-between items-center">
          <button
            onClick={saveSettings}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Save size={20} />
            <span>Lưu cài đặt</span>
          </button>
          <div className="flex space-x-3">
            <button
              onClick={handlePreview}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye size={20} />
              <span>Preview</span>
            </button>
            <button
              onClick={handleSend}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
              <span>{loading ? 'Đang gửi...' : 'Gửi ngay'}</span>
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center space-x-2">
          <CheckCircle size={20} />
          <span>Đã lưu cài đặt thành công!</span>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Preview báo cáo Telegram</h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {previewContent}
                </pre>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Notifications

