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

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173', // Vite default port
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ].filter(Boolean);

    console.log('CORS: Request from origin:', origin);
    console.log('CORS: Allowed origins:', allowedOrigins);
    console.log('CORS: NODE_ENV:', process.env.NODE_ENV);

    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      console.log('CORS: Development mode - allowing all origins');
      return callback(null, true);
    }

    // Check if origin matches any allowed origin (string)
    if (allowedOrigins.includes(origin)) {
      console.log('CORS: Origin allowed (in allowed list)');
      callback(null, true);
      return;
    }

    // Allow all Render.com domains in production (for flexibility)
    if (origin && origin.includes('.onrender.com')) {
      console.log('CORS: Allowing Render.com domain:', origin);
      callback(null, true);
      return;
    }

    // For other origins, still allow but log warning
    console.warn(`CORS: Origin not explicitly allowed: ${origin}, but allowing anyway`);
    callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
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

