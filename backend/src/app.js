// Load .env file FIRST using dotenv package
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv to load .env file from backend directory
const envPath = join(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

// Validate environment loading
if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  console.log('🔍 Looking for .env file at:', envPath);
} else {
  console.log('✅ Environment variables loaded successfully from .env file');
  console.log('📁 Loaded from:', envPath);
}

// Debug: Verify environment loading
console.log('\n🔧 Environment verification:');
console.log('- SPEECHMATICS_API_KEY:', process.env.SPEECHMATICS_API_KEY ? 'SET' : 'NOT SET');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('- PORT:', process.env.PORT || 'NOT SET (will use default)');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

// Validate critical environment variables
const requiredEnvVars = [
  'SPEECHMATICS_API_KEY',
  'OPENAI_API_KEY', 
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

console.log('\n✅ All required environment variables are configured');

// Now import other modules after environment is loaded
import express from 'express';
import cors from 'cors';
import analysisRoutes from './controllers/analysisController.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../uploads')));

// Routes
app.use('/api/analysis', analysisRoutes);

// Error handling
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend should connect to: http://localhost:${PORT}/api`);
});