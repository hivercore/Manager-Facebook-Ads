import { Request, Response } from 'express'
import { TelegramService } from '../services/telegramService'

const telegramService = new TelegramService()

export const testTelegram = async (req: Request, res: Response) => {
  try {
    const { token, chatId } = req.body

    if (!token || !chatId) {
      return res.status(400).json({ error: 'Token và Chat ID là bắt buộc' })
    }

    const success = await telegramService.testConnection(token, chatId)

    if (success) {
      res.json({ success: true, message: 'Thông báo test đã được gửi thành công!' })
    } else {
      res.status(500).json({ error: 'Không thể gửi thông báo test' })
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi khi gửi thông báo Telegram' })
  }
}

export const sendSpendLimitAlert = async (req: Request, res: Response) => {
  try {
    const { token, chatId, accountId, accountName, currentSpend, limit } = req.body

    if (!token || !chatId || !accountId || currentSpend === undefined || limit === undefined) {
      return res.status(400).json({ error: 'Thiếu thông tin cần thiết' })
    }

    const success = await telegramService.sendSpendLimitAlert(
      token,
      chatId,
      accountId,
      accountName || accountId,
      currentSpend,
      limit
    )

    if (success) {
      res.json({ success: true, message: 'Thông báo cảnh báo đã được gửi!' })
    } else {
      res.status(500).json({ error: 'Không thể gửi thông báo cảnh báo' })
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi khi gửi thông báo Telegram' })
  }
}

export const sendReport = async (req: Request, res: Response) => {
  try {
    const { token, chatId, title, message } = req.body

    if (!token || !chatId || !title || !message) {
      return res.status(400).json({ error: 'Thiếu thông tin cần thiết' })
    }

    const success = await telegramService.sendReportMessage(token, chatId, title, message)

    if (success) {
      res.json({ success: true, message: 'Đã gửi báo cáo Telegram' })
    } else {
      res.status(500).json({ error: 'Không thể gửi báo cáo Telegram' })
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi khi gửi báo cáo Telegram' })
  }
}

