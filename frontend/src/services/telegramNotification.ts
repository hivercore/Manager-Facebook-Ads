import { api } from './api'

interface Settings {
  telegramToken: string
  telegramChatId: string
  spendLimit: number
  enableNotifications: boolean
}

export const getSettings = (): Settings | null => {
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

export const checkSpendLimit = async (accountId: string, accountName: string, currentSpend: number) => {
  const settings = getSettings()
  
  if (!settings || !settings.enableNotifications || !settings.telegramToken || !settings.telegramChatId) {
    return false
  }

  if (settings.spendLimit <= 0) {
    return false
  }

  // Check if current spend has reached or exceeded the limit
  if (currentSpend >= settings.spendLimit) {
    try {
      // Check if we've already sent notification for this account today
      const notificationKey = `telegram_alert_${accountId}_${new Date().toDateString()}`
      const alreadyNotified = localStorage.getItem(notificationKey)
      
      if (alreadyNotified) {
        // Already sent notification today, skip
        return false
      }

      // Send notification
      await api.post('/telegram/alert', {
        token: settings.telegramToken,
        chatId: settings.telegramChatId,
        accountId: accountId,
        accountName: accountName,
        currentSpend: currentSpend,
        limit: settings.spendLimit,
      })

      // Mark as notified for today
      localStorage.setItem(notificationKey, 'true')
      
      return true
    } catch (error: any) {
      console.error('Error sending Telegram alert:', error)
      return false
    }
  }

  return false
}

