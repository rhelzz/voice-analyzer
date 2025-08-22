import axios from 'axios';

// Detect environment
const isProduction = import.meta.env.PROD;
const API_BASE_URL = isProduction 
  ? '/api' // Relative path for production Vercel
  : import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', isProduction ? 'production' : 'development');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log('Making request to:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const uploadAndAnalyzeAudio = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('audioFile', file);

  return api.post('/analysis/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

export const getAnalysisHistory = async (limit = 50, offset = 0) => {
  return api.get(`/analysis/history?limit=${limit}&offset=${offset}`);
};

export const getAnalysisById = async (id) => {
  return api.get(`/analysis/history/${id}`);
};

export const deleteAnalysis = async (id) => {
  return api.delete(`/analysis/history/${id}`);
};

export const getStorageStats = async () => {
  return api.get('/analysis/stats');
};

export const checkHealth = () => api.get('/analysis/health');

export const uploadAndAnalyzeText = async (data) => {
  if (data instanceof FormData) {
    // File upload
    return api.post('/analysis/analyze-text', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  } else {
    // Direct text
    return api.post('/analysis/analyze-text', data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export default api;