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

// CORS configuration - Allow all origins for simplicity
// This makes the app accessible from anywhere without complex configuration
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Apply CORS before all other middleware
app.use(cors(corsOptions));

// Additional CORS headers as fallback to ensure headers are always set
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Always set CORS headers for any origin
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  } else {
    // If no origin, still set headers to allow requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

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

