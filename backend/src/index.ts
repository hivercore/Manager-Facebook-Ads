import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { adsRouter } from './routes/ads';
import { accountsRouter } from './routes/accounts';
import { campaignsRouter } from './routes/campaigns';
import { insightsRouter } from './routes/insights';
import { authRouter } from './routes/auth';
import { telegramRouter } from './routes/telegram';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - cho phép frontend URL từ biến môi trường
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/ads', adsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/telegram', telegramRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Facebook Ads Manager API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

