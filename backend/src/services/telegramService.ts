import axios from 'axios'

export class TelegramService {
  private baseURL = 'https://api.telegram.org/bot'

  async sendMessage(token: string, chatId: string, message: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseURL}${token}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }, {
        timeout: 10000, // 10 seconds timeout
      })

      return response.data.ok === true
    } catch (error: any) {
      console.error('Error sending Telegram message:', error.response?.data || error.message)
      
      const errorCode = error.response?.data?.error_code
      const errorDescription = error.response?.data?.description || error.message
      
      // Provide more specific error messages
      if (errorCode === 400) {
        if (errorDescription.includes('chat not found')) {
          throw new Error('Chat không tìm thấy. Vui lòng:\n1. Đảm bảo Chat ID đúng\n2. Gửi lệnh /start cho bot trước khi test\n3. Nếu là nhóm, thêm bot vào nhóm và gửi /start')
        } else if (errorDescription.includes('chat_id')) {
          throw new Error('Chat ID không hợp lệ. Vui lòng kiểm tra lại Chat ID')
        } else {
          throw new Error(`Lỗi từ Telegram API: ${errorDescription}`)
        }
      } else if (errorCode === 401) {
        throw new Error('Token không hợp lệ. Vui lòng kiểm tra lại Telegram Bot Token')
      } else if (errorCode === 403) {
        throw new Error('Bot bị chặn. Vui lòng gửi /start cho bot trước')
      } else {
        throw new Error(errorDescription || 'Không thể gửi thông báo Telegram')
      }
    }
  }

  async testConnection(token: string, chatId: string): Promise<boolean> {
    try {
      // First, validate token by getting bot info
      try {
        const botInfoResponse = await axios.get(`${this.baseURL}${token}/getMe`, {
          timeout: 5000,
        })
        
        if (!botInfoResponse.data.ok) {
          throw new Error('Token không hợp lệ. Vui lòng kiểm tra lại Telegram Bot Token')
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          throw new Error('Token không hợp lệ. Vui lòng kiểm tra lại Telegram Bot Token')
        }
        throw new Error('Không thể kết nối với Telegram API. Vui lòng thử lại sau')
      }

      // Send test message
      const message = '✅ <b>Test thông báo</b>\n\nĐây là thông báo test từ Facebook Ads Manager. Nếu bạn nhận được tin nhắn này, cấu hình Telegram đã hoạt động đúng!'
      return await this.sendMessage(token, chatId, message)
    } catch (error: any) {
      throw error
    }
  }

  async sendSpendLimitAlert(token: string, chatId: string, accountId: string, accountName: string, currentSpend: number, limit: number): Promise<boolean> {
    try {
      const message = `⚠️ <b>CẢNH BÁO: Đã đạt giới hạn chi tiêu</b>\n\n` +
        `📊 <b>Tài khoản:</b> ${accountName}\n` +
        `🆔 <b>ID:</b> ${accountId}\n` +
        `💰 <b>Chi tiêu hiện tại:</b> ${this.formatCurrency(currentSpend)}\n` +
        `🎯 <b>Giới hạn:</b> ${this.formatCurrency(limit)}\n` +
        `\n⏰ <i>Thời gian: ${new Date().toLocaleString('vi-VN')}</i>`

      return await this.sendMessage(token, chatId, message)
    } catch (error: any) {
      throw error
    }
  }

  async sendReportMessage(token: string, chatId: string, title: string, body: string): Promise<boolean> {
    const message = `${title}\n\n${body}`
    return await this.sendMessage(token, chatId, message)
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
}

