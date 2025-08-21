import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle2, FileAudio, Info } from 'lucide-react';

const UploadForm = ({ onUploadSuccess, onUploadError, isLoading, setIsLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('idle'); // idle, uploading, transcribing, analyzing
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Check backend connection on component mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const { checkHealth } = await import('../services/api');
      await checkHealth();
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Backend connection failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const handleFiles = (files) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/mp4'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['mp3', 'wav', 'm4a', 'mp4'];
    
    if (!allowedExtensions.includes(fileExtension) && !allowedTypes.some(type => file.type.includes(type.split('/')[1]))) {
      onUploadError('Format file tidak didukung. Gunakan file audio (.mp3, .wav, .m4a, .mp4)');
      return;
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      onUploadError('Ukuran file terlalu besar. Maksimal 50MB');
      return;
    }

    uploadFile(file);
  };

  const uploadFile = async (file) => {
    if (connectionStatus !== 'connected') {
      onUploadError('Tidak dapat terhubung ke server. Periksa koneksi backend.');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setCurrentStep('uploading');

    try {
      const { uploadAndAnalyzeAudio } = await import('../services/api');
      
      const response = await uploadAndAnalyzeAudio(file, (progressPercent) => {
        setProgress(progressPercent);
        if (progressPercent >= 100) {
          setCurrentStep('transcribing');
        }
      });
      
      if (response.data.success) {
        setCurrentStep('analyzing');
        // Small delay to show analyzing step
        setTimeout(() => {
          onUploadSuccess(response.data.data);
          setCurrentStep('idle');
        }, 1000);
      } else {
        throw new Error(response.data.error || 'Upload gagal');
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Upload gagal. Silakan coba lagi.';
      onUploadError(errorMessage);
      setCurrentStep('idle');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!isLoading) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (!isLoading) {
      handleFiles(e.target.files);
    }
  };

  const getStepMessage = () => {
    switch (currentStep) {
      case 'uploading':
        return 'Mengunggah file...';
      case 'transcribing':
        return 'Melakukan transkrip audio...';
      case 'analyzing':
        return 'Menganalisis percakapan...';
      default:
        return '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Connection Status Warning */}
      {connectionStatus === 'disconnected' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
          <div>
            <h3 className="text-red-800 font-medium">Backend Connection Failed</h3>
            <p className="text-red-700 text-sm">
              Unable to connect to the analysis server. Please check if the backend is running.
            </p>
            <button
              onClick={checkBackendConnection}
              className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
          <FileAudio className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Voice Analyzer</h1>
        <p className="text-xl text-gray-600 mb-2">Analisis Percakapan Audio dengan AI</p>
        <p className="text-gray-500">Upload file audio untuk mendapatkan transkrip dan analisis mendalam</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
            dragActive
              ? 'border-blue-400 bg-blue-50 scale-105'
              : isLoading
              ? 'border-gray-200 bg-gray-50'
              : connectionStatus === 'connected'
              ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              : 'border-red-300 bg-red-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.mp4"
            onChange={handleChange}
            disabled={isLoading || connectionStatus !== 'connected'}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          {isLoading ? (
            <div className="space-y-4">
              <div className="spinner mx-auto"></div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {getStepMessage()}
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${currentStep === 'uploading' ? progress : currentStep === 'transcribing' ? 70 : 90}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {currentStep === 'uploading' && `${progress}% selesai`}
                  {currentStep === 'transcribing' && 'Memproses audio dengan Speechmatics...'}
                  {currentStep === 'analyzing' && 'Menganalisis dengan OpenAI...'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className={`mx-auto h-16 w-16 ${
                connectionStatus === 'connected' ? 'text-gray-400' : 'text-red-400'
              }`} />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {connectionStatus === 'connected' ? 'Upload File Audio' : 'Server Tidak Terhubung'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {connectionStatus === 'connected' 
                    ? 'Seret dan lepas file audio di sini, atau klik untuk memilih'
                    : 'Pastikan backend server sedang berjalan'
                  }
                </p>
                {connectionStatus === 'connected' && (
                  <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105">
                    <Upload className="h-5 w-5 mr-2" />
                    Pilih File Audio
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* File Requirements */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="text-blue-800 font-medium mb-2">Persyaratan File:</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Format yang didukung: MP3, WAV, M4A, MP4</li>
                <li>• Ukuran maksimal: 50MB ({formatFileSize(50 * 1024 * 1024)})</li>
                <li>• Kualitas audio yang baik untuk hasil optimal</li>
                <li>• File percakapan 2 orang (Agent & Customer) lebih baik</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <FileAudio className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Transkrip Otomatis</h3>
          <p className="text-gray-600 text-sm">Konversi audio ke teks dengan teknologi Speechmatics AI</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analisis Mendalam</h3>
          <p className="text-gray-600 text-sm">Penilaian kualitas percakapan dengan OpenAI GPT-4</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Upload className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Laporan Lengkap</h3>
          <p className="text-gray-600 text-sm">Skor, insight, dan rekomendasi untuk perbaikan</p>
        </div>
      </div>
    </div>
  );
};

export default UploadForm;