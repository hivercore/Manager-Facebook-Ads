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

// Simple CORS - Allow all origins (no configuration needed)
// This makes the app work from any domain
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  console.log(`[CORS] ${req.method} ${req.path} from origin: ${origin || 'no origin'}`);
  
  // Always allow any origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`[CORS] Set Access-Control-Allow-Origin: ${origin}`);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`[CORS] Set Access-Control-Allow-Origin: *`);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Handling OPTIONS preflight request`);
    return res.status(200).end();
  }
  
  next();
});

// Also use cors middleware as backup
app.use(cors({
  origin: true,
  credentials: true,
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
  console.log('Health check requested from:', req.headers.origin || req.headers.referer || 'unknown');
  res.json({ 
    status: 'ok', 
    message: 'Facebook Ads Manager API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware - must be after all routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  // Ensure we always return JSON
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

