import express from 'express';
import cors from 'cors';
import analysisRoutes from './controllers/analysisController.js';

const app = express();

// Environment variables validation
const requiredEnvVars = [
  'SPEECHMATICS_API_KEY',
  'OPENAI_API_KEY', 
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
}

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-app.vercel.app', // Replace with your domain
    /\.vercel\.app$/
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/analysis', analysisRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error'
  });
});

// Export for Vercel serverless
export default app;