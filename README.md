# Voice Analyzer - AI-Powered Conversation Analysis

Voice Analyzer adalah aplikasi web yang menggunakan AI untuk menganalisis percakapan audio dan teks. Aplikasi ini mengintegrasikan Speechmatics untuk speech-to-text, OpenAI GPT-4 untuk analisis percakapan, dan Supabase untuk storage dan database.

## 🚀 Fitur Utama

- **Transkrip Otomatis**: Konversi audio ke teks dengan teknologi Speechmatics AI
- **Analisis Mendalam**: Penilaian kualitas percakapan dengan OpenAI GPT-4
- **Analisis Teks**: Upload atau paste transkrip untuk analisis langsung
- **Speaker Diarization**: Identifikasi pembicara (Agent vs Customer)
- **Laporan Lengkap**: Skor, insight, dan rekomendasi untuk perbaikan
- **Riwayat Analisis**: Simpan dan kelola hasil analisis
- **Dashboard**: Interface yang user-friendly dengan Tailwind CSS

## 🛠️ Tech Stack

### Frontend
- **React.js 18** - UI Framework
- **Vite** - Build Tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Axios** - HTTP Client
- **Supabase JS** - Database Client

### Backend
- **Node.js** - Runtime Environment
- **Express.js** - Web Framework
- **Multer** - File Upload Middleware
- **Speechmatics API** - Speech Recognition
- **OpenAI API** - AI Analysis
- **Supabase** - Database & Storage

## 📋 Prerequisites

Sebelum instalasi, pastikan Anda memiliki:

- **Node.js** (v18 atau lebih tinggi)
- **npm** atau **yarn**
- **Speechmatics API Key** - [Daftar di sini](https://www.speechmatics.com/)
- **OpenAI API Key** - [Daftar di sini](https://platform.openai.com/)
- **Supabase Account** - [Daftar di sini](https://supabase.com/)

## 🔧 Instalasi Development

### 1. Clone Repository

```bash
git clone <repository-url>
cd voice-analyzer-primary
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Buat file `.env` di folder `backend`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
UPLOAD_LIMIT=50MB

# API Keys
SPEECHMATICS_API_KEY=your_speechmatics_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install
```

Buat file `.env` di folder `frontend`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Setup Supabase Database

1. Login ke [Supabase Dashboard](https://app.supabase.com/)
2. Buat project baru
3. Jalankan SQL berikut di SQL Editor:

```sql
-- Create analysis_results table
CREATE TABLE analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  audio_file_url TEXT,
  transcript_text TEXT,
  analysis_json JSONB NOT NULL,
  overall_scores JSONB,
  agent_scores JSONB,
  customer_scores JSONB,
  file_size BIGINT,
  duration_estimate INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-files', 'audio-files', true);

-- Set up storage policies
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audio-files');

CREATE POLICY "Allow public downloads" ON storage.objects
  FOR SELECT USING (bucket_id = 'audio-files');

CREATE POLICY "Allow public deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'audio-files');
```

### 5. Jalankan Aplikasi

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Akses aplikasi di: `http://localhost:5173`

## 🚀 Deploy ke Server Production

### Option 1: Deploy ke VPS/Server Mandiri

#### Prerequisites Server
- Ubuntu 20.04+ atau CentOS 7+
- Node.js 18+
- Nginx (untuk reverse proxy)
- PM2 (untuk process management)
- Domain name (opsional)

#### 1. Setup Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

#### 2. Upload Project ke Server

```bash
# Clone project
git clone <repository-url>
cd voice-analyzer-primary

# Setup backend
cd backend
npm install --production
```

#### 3. Configure Environment

Buat file `backend/.env` dengan konfigurasi production:

```env
PORT=5000
NODE_ENV=production
UPLOAD_LIMIT=50MB

SPEECHMATICS_API_KEY=your_speechmatics_api_key
OPENAI_API_KEY=your_openai_api_key

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### 4. Build Frontend

```bash
cd ../frontend

# Update API URL untuk production
echo "VITE_API_URL=https://yourdomain.com/api" > .env
echo "VITE_SUPABASE_URL=your_supabase_url" >> .env
echo "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env

npm install
npm run build
```

#### 5. Setup PM2

```bash
cd ../backend

# Start backend dengan PM2
pm2 start src/app.js --name "voice-analyzer-backend"
pm2 startup
pm2 save
```

#### 6. Configure Nginx

Buat file `/etc/nginx/sites-available/voice-analyzer`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;  # Ganti dengan domain Anda

    # Frontend static files
    location / {
        root /path/to/voice-analyzer-primary/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Upload size limit
        client_max_body_size 50M;
    }

    # Uploads directory
    location /uploads/ {
        alias /path/to/voice-analyzer-primary/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/voice-analyzer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. Setup SSL dengan Let's Encrypt (Opsional)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

### Option 2: Deploy ke Heroku

#### Backend (Heroku)

1. Install Heroku CLI
2. Setup project:

```bash
cd backend
heroku create voice-analyzer-backend

# Set environment variables
heroku config:set SPEECHMATICS_API_KEY=your_key
heroku config:set OPENAI_API_KEY=your_key
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_ANON_KEY=your_key
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_key
heroku config:set NODE_ENV=production

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

#### Frontend (Vercel/Netlify)

**Vercel:**
```bash
cd frontend
npm install -g vercel
vercel

# Set environment variables di Vercel dashboard:
# VITE_API_URL=https://your-heroku-app.herokuapp.com/api
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Option 3: Deploy ke DigitalOcean App Platform

1. Push code ke GitHub
2. Login ke DigitalOcean
3. Create new App
4. Connect GitHub repository
5. Configure build settings:

**Backend:**
- Build command: `npm install`
- Run command: `npm start`
- Environment variables: (set semua dari .env)

**Frontend:**
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: (set semua dari .env)

## 🔒 Security Considerations

### Production Security

1. **Environment Variables**: Jangan commit file `.env` ke repository
2. **API Keys**: Gunakan environment variables untuk semua API keys
3. **File Uploads**: Validasi file type dan size limit
4. **CORS**: Configure CORS untuk domain specific
5. **Rate Limiting**: Implement rate limiting untuk API endpoints
6. **Firewall**: Setup firewall rules yang appropriate

### Recommended Security Headers

```javascript
// backend/src/app.js
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

## 📊 Monitoring & Maintenance

### Monitoring dengan PM2

```bash
# Check status
pm2 status

# View logs
pm2 logs voice-analyzer-backend

# Restart app
pm2 restart voice-analyzer-backend

# Monitor resources
pm2 monit
```

### Log Management

```bash
# Setup log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Backup Strategy

1. **Database**: Supabase automatic backups
2. **Uploaded Files**: Regular backup dari `/uploads` directory
3. **Environment**: Backup konfigurasi environment variables

## 🐛 Troubleshooting

### Common Issues

1. **Backend tidak start**: Check environment variables di `.env`
2. **File upload gagal**: Check disk space dan permissions
3. **API error**: Verify API keys Speechmatics dan OpenAI
4. **Database error**: Check Supabase connection dan credentials

### Debug Commands

```bash
# Check backend health
curl http://localhost:5000/api/analysis/health

# Check environment variables
curl http://localhost:5000/api/analysis/debug-env

# View PM2 logs
pm2 logs voice-analyzer-backend --lines 100
```

## 📝 API Documentation

### Endpoints

- `POST /api/analysis/upload` - Upload dan analisis file audio
- `POST /api/analysis/analyze-text` - Analisis teks transkrip
- `GET /api/analysis/history` - Get riwayat analisis
- `GET /api/analysis/history/:id` - Get detail analisis
- `DELETE /api/analysis/history/:id` - Delete analisis
- `GET /api/analysis/stats` - Get storage statistics
- `GET /api/analysis/health` - Health check

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

Untuk support dan pertanyaan:
- Email: [your-email@domain.com]
- Issues: [GitHub Issues](link-to-issues)
- Documentation: [Link to docs]

---

**Powered by Speechmatics, OpenAI & Supabase**
