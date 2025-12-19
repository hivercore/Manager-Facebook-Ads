import React, { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Save, Bell, DollarSign, Key, AlertCircle, CheckCircle } from 'lucide-react'
import { api } from '../services/api'

interface SettingsData {
  telegramToken: string
  telegramChatId: string
  spendLimit: number
  enableNotifications: boolean
}

const Settings = () => {
  const [settings, setSettings] = useState<SettingsData>({
    telegramToken: '',
    telegramChatId: '',
    spendLimit: 0,
    enableNotifications: false,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | React.ReactNode | null>(null)

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('appSettings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings({
          telegramToken: parsed.telegramToken || '',
          telegramChatId: parsed.telegramChatId || '',
          spendLimit: parsed.spendLimit || 0,
          enableNotifications: parsed.enableNotifications || false,
        })
      } catch (err) {
        console.error('Error loading settings:', err)
      }
    }
  }, [])

  const handleChange = (field: keyof SettingsData, value: string | number | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
    setSaved(false)
    setError(null)
  }

  const handleSave = () => {
    try {
      // Validate Telegram settings if notifications are enabled
      if (settings.enableNotifications) {
        if (!settings.telegramToken.trim()) {
          setError('Vui lòng nhập Telegram Bot Token')
          return
        }
        if (!settings.telegramChatId.trim()) {
          setError('Vui lòng nhập Telegram Chat ID')
          return
        }
      }

      // Save to localStorage
      localStorage.setItem('appSettings', JSON.stringify(settings))
      
      setSaved(true)
      setError(null)
      
      // Hide success message after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError('Không thể lưu cài đặt: ' + err.message)
    }
  }

  const testTelegram = async () => {
    if (!settings.telegramToken || !settings.telegramChatId) {
      setError('Vui lòng nhập Telegram Bot Token và Chat ID trước khi test')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await api.post('/telegram/test', {
        token: settings.telegramToken,
        chatId: settings.telegramChatId,
      })

      if (response.data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(response.data.error || 'Không thể gửi thông báo test')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Lỗi khi test Telegram'
      // Format error message to preserve line breaks
      setError(errorMessage.split('\n').map((line: string, index: number) => (
        <React.Fragment key={index}>
          {line}
          {index < errorMessage.split('\n').length - 1 && <br />}
        </React.Fragment>
      )))
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cài đặt</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Quản lý cài đặt và thông báo</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium mb-1">Lỗi:</p>
              <div className="text-sm whitespace-pre-line">
                {typeof error === 'string' ? error : error}
              </div>
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center space-x-2">
          <CheckCircle size={20} />
          <span>Đã lưu cài đặt thành công!</span>
        </div>
      )}

      {/* Telegram Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bell className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Thông báo Telegram</h2>
            <p className="text-sm text-gray-500">Cấu hình thông báo qua Telegram Bot</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Key className="inline h-4 w-4 mr-1" />
              Telegram Bot Token
            </label>
            <input
              type="text"
              value={settings.telegramToken}
              onChange={(e) => handleChange('telegramToken', e.target.value)}
              placeholder="Nhập Telegram Bot Token (ví dụ: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">📋 Cách lấy Telegram Bot Token:</p>
              <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside ml-2">
                <li>Mở Telegram và tìm kiếm <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-semibold underline">@BotFather</a></li>
                <li>Gửi lệnh <code className="bg-blue-100 px-1.5 py-0.5 rounded">/newbot</code> hoặc <code className="bg-blue-100 px-1.5 py-0.5 rounded">/start</code></li>
                <li>Làm theo hướng dẫn để đặt tên cho bot (ví dụ: "My Ads Manager Bot")</li>
                <li>Đặt username cho bot (phải kết thúc bằng "bot", ví dụ: "my_ads_manager_bot")</li>
                <li>BotFather sẽ trả về token dạng: <code className="bg-blue-100 px-1.5 py-0.5 rounded">123456789:ABCdefGHIjklMNOpqrsTUVwxyz</code></li>
                <li>Sao chép token và dán vào ô trên</li>
              </ol>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Key className="inline h-4 w-4 mr-1" />
              Telegram Chat ID
            </label>
            <input
              type="text"
              value={settings.telegramChatId}
              onChange={(e) => handleChange('telegramChatId', e.target.value)}
              placeholder="Nhập Chat ID (ví dụ: 123456789)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-2">📋 Cách lấy Telegram Chat ID:</p>
              <div className="text-xs text-green-800 space-y-2">
                <div>
                  <p className="font-medium mb-1">Cách 1: Sử dụng bot</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Mở Telegram và tìm kiếm <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="font-semibold underline">@userinfobot</a></li>
                    <li>Gửi lệnh <code className="bg-green-100 px-1.5 py-0.5 rounded">/start</code></li>
                    <li>Bot sẽ trả về thông tin của bạn, tìm số <code className="bg-green-100 px-1.5 py-0.5 rounded">Id</code> (đây là Chat ID của bạn)</li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium mb-1">Cách 2: Sử dụng bot khác</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Tìm kiếm <a href="https://t.me/getidsbot" target="_blank" rel="noopener noreferrer" className="font-semibold underline">@getidsbot</a></li>
                    <li>Gửi lệnh <code className="bg-green-100 px-1.5 py-0.5 rounded">/start</code></li>
                    <li>Bot sẽ hiển thị Chat ID của bạn</li>
                  </ol>
                </div>
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-medium text-yellow-900">💡 Lưu ý quan trọng:</p>
                  <ul className="text-yellow-800 space-y-1 mt-1">
                    <li>Chat ID là một số (có thể âm nếu là nhóm). Ví dụ: <code className="bg-yellow-100 px-1.5 py-0.5 rounded">123456789</code> hoặc <code className="bg-yellow-100 px-1.5 py-0.5 rounded">-1001234567890</code></li>
                    <li><strong>QUAN TRỌNG:</strong> Sau khi nhập Token và Chat ID, bạn <strong>PHẢI</strong> tìm bot của mình trên Telegram và gửi lệnh <code className="bg-yellow-100 px-1.5 py-0.5 rounded">/start</code> trước khi test. Nếu không, sẽ báo lỗi "chat not found"</li>
                    <li>Nếu bot của bạn có tên là "My Bot", hãy tìm kiếm username bot (ví dụ: @my_bot) và gửi /start</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="enableNotifications"
              checked={settings.enableNotifications}
              onChange={(e) => handleChange('enableNotifications', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="enableNotifications" className="text-sm font-medium text-gray-700">
              Bật thông báo Telegram
            </label>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={testTelegram}
              disabled={loading || !settings.telegramToken || !settings.telegramChatId}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang gửi...' : 'Test thông báo'}
            </button>
          </div>
        </div>
      </div>

      {/* Spend Limit Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <DollarSign className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Giới hạn chi tiêu</h2>
            <p className="text-sm text-gray-500">Thiết lập giới hạn chi tiêu và nhận thông báo khi đạt giới hạn</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Giới hạn chi tiêu (₫)
            </label>
            <input
              type="number"
              value={settings.spendLimit || ''}
              onChange={(e) => handleChange('spendLimit', parseFloat(e.target.value) || 0)}
              placeholder="Nhập giới hạn chi tiêu (ví dụ: 1000000)"
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Hệ thống sẽ gửi thông báo khi tổng chi tiêu đạt hoặc vượt quá giới hạn này
            </p>
          </div>

          {settings.spendLimit > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Lưu ý:</p>
                  <p>Thông báo sẽ được gửi khi tổng chi tiêu đạt {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(settings.spendLimit)}</p>
                  <p className="mt-1">Để nhận thông báo, vui lòng bật "Bật thông báo Telegram" ở trên.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Save size={20} />
          <span>Lưu cài đặt</span>
        </button>
      </div>
    </div>
  )
}

export default Settings

