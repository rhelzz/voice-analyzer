import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, ArrowLeft, FileAudio, Type, Clipboard } from 'lucide-react';
import { uploadAndAnalyzeText } from '../services/api';

const TextAnalysisPage = ({ onBack, onAnalysisComplete }) => {
  const [dragActive, setDragActive] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [filename, setFilename] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputMethod, setInputMethod] = useState('upload'); // 'upload' or 'paste'

  const handleFiles = (files) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['text/plain', '.txt'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    if (fileExtension !== 'txt' && !file.type.includes('text')) {
      setError('Format file tidak didukung. Gunakan file teks (.txt)');
      return;
    }

    // Validate file size (5MB for text)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file terlalu besar. Maksimal 5MB');
      return;
    }

    setFilename(file.name);
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      setTranscriptText(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!transcriptText.trim()) {
      setError('Silakan masukkan teks transkrip');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response;
      
      if (inputMethod === 'upload' && filename) {
        // Create a virtual file for upload
        const blob = new Blob([transcriptText], { type: 'text/plain' });
        const formData = new FormData();
        formData.append('textFile', blob, filename);
        
        response = await uploadAndAnalyzeText(formData);
      } else {
        // Direct text analysis
        response = await uploadAndAnalyzeText({
          transcriptText,
          filename: filename || `transcript-${Date.now()}.txt`
        });
      }
      
      if (response.data.success) {
        onAnalysisComplete(response.data.data);
      } else {
        throw new Error(response.data.error || 'Analisis gagal');
      }
    } catch (error) {
      console.error('Text analysis error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Analisis gagal. Silakan coba lagi.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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

  const sampleTranscript = `[0:00] Agent: Selamat pagi, dengan Bapak Ahmad?
[0:05] Customer: Ya benar, selamat pagi
[0:08] Agent: Perkenalkan saya dari PT Asuransi ABC, ada produk asuransi kesehatan yang mungkin cocok untuk Bapak
[0:15] Customer: Oh iya, boleh dijelaskan seperti apa?
[0:18] Agent: Jadi produk kami memberikan coverage hingga 500 juta dengan premi yang sangat terjangkau
[0:25] Customer: Berapa preminya per bulan?`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-none">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Kembali
              </button>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Analisis Teks Transkrip</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mb-4">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Text Transcript Analyzer</h1>
          <p className="text-xl text-gray-600 mb-2">Analisis Percakapan dari Teks Transkrip</p>
          <p className="text-gray-500">Upload file teks atau paste transkrip untuk mendapatkan analisis mendalam</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input Method Toggle */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setInputMethod('upload')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  inputMethod === 'upload' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </button>
              <button
                onClick={() => setInputMethod('paste')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  inputMethod === 'paste' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Type className="h-4 w-4 mr-2" />
                Paste Teks
              </button>
            </div>
          </div>

          {/* File Upload Section */}
          {inputMethod === 'upload' && (
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 mb-6 ${
                dragActive
                  ? 'border-blue-400 bg-blue-50 scale-105'
                  : isLoading
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={handleChange}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />

              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload File Teks</h3>
              <p className="text-gray-600 mb-4">
                Seret dan lepas file .txt di sini, atau klik untuk memilih
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200">
                <Upload className="h-4 w-4 mr-2" />
                Pilih File Teks
              </div>
            </div>
          )}

          {/* Text Input Section */}
          {inputMethod === 'paste' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Paste Transkrip di sini:
                </label>
                <button
                  onClick={() => setTranscriptText(sampleTranscript)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Clipboard className="h-3 w-3 mr-1" />
                  Gunakan Contoh
                </button>
              </div>
              <textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Contoh format:
[0:00] Agent: Selamat pagi, dengan Bapak Ahmad?
[0:05] Customer: Ya benar, selamat pagi
[0:08] Agent: Perkenalkan saya dari PT Asuransi ABC..."
                className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-gray-500">
                  {transcriptText.length} karakter
                </p>
                {inputMethod === 'paste' && (
                  <input
                    type="text"
                    placeholder="Nama file (opsional)"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-3 py-1 w-48"
                  />
                )}
              </div>
            </div>
          )}

          {/* File Info */}
          {filename && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-blue-800 font-medium">{filename}</p>
                  <p className="text-blue-600 text-sm">
                    {transcriptText.length} karakter siap dianalisis
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Analyze Button */}
          <div className="text-center">
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !transcriptText.trim()}
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <div className="spinner mr-3"></div>
                  Menganalisis...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Analisis Transkrip
                </>
              )}
            </button>
          </div>
        </div>

        {/* Format Guidelines */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Format Transkrip yang Didukung</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Format dengan Timestamp:</h4>
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                <code>
                  [0:00] Agent: Selamat pagi<br/>
                  [0:05] Customer: Pagi juga<br/>
                  [0:08] Agent: Ada yang bisa saya bantu?
                </code>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Format Sederhana:</h4>
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                <code>
                  Agent: Selamat pagi<br/>
                  Customer: Pagi juga<br/>
                  Agent: Ada yang bisa saya bantu?
                </code>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Tips untuk Hasil Terbaik:</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Gunakan label "Agent" dan "Customer" untuk pembicara</li>
              <li>• Sertakan timestamp jika tersedia untuk analisis yang lebih akurat</li>
              <li>• Pastikan percakapan cukup panjang untuk analisis yang bermakna</li>
              <li>• File maksimal 5MB untuk performa optimal</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextAnalysisPage;