import { Router } from 'express'
import { testTelegram, sendSpendLimitAlert, sendReport } from '../controllers/telegramController'

export const telegramRouter = Router()

telegramRouter.post('/test', testTelegram)
telegramRouter.post('/alert', sendSpendLimitAlert)
telegramRouter.post('/report', sendReport)

