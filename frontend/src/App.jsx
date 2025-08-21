import React, { useState } from 'react';
import UploadForm from './components/UploadForm';
import ResultsDisplay from './components/ResultsDisplay';
import HistoryPage from './components/HistoryPage';
import TextAnalysisPage from './components/TextAnalysisPage';
import { AlertCircle, CheckCircle2, Database, FileText, FileAudio } from 'lucide-react';

// Sidebar component
const Sidebar = ({ currentPage, onNavigate }) => (
  <aside className="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-20">
    <div className="flex items-center px-6 py-6 border-b border-gray-100">
      <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">VA</span>
      </div>
      <span className="ml-3 text-xl font-bold text-gray-900">Voice Analyzer</span>
    </div>
    <nav className="flex-1 px-6 py-4 space-y-2">
      <button
        onClick={() => onNavigate('upload')}
        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
          currentPage === 'upload' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <FileAudio className="h-5 w-5 mr-3" />
        Analisis Audio
      </button>
      <button
        onClick={() => onNavigate('text-analysis')}
        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
          currentPage === 'text-analysis' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <FileText className="h-5 w-5 mr-3" />
        Analisis Teks
      </button>
      <button
        onClick={() => onNavigate('history')}
        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
          currentPage === 'history' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Database className="h-5 w-5 mr-3" />
        Riwayat Analisis
      </button>
    </nav>
    <div className="px-6 py-4 border-t border-gray-100 text-xs text-gray-400">
      Powered by Speechmatics, OpenAI & Supabase
    </div>
  </aside>
);

function App() {
  const [currentPage, setCurrentPage] = useState('upload');
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Navigation handler
  const handleNavigate = (page) => {
    setCurrentPage(page);
    setError(null);
    if (page !== 'results') setAnalysisData(null);
  };

  const handleUploadSuccess = (data) => {
    setAnalysisData(data);
    setCurrentPage('results');
    setError(null);
  };

  const handleUploadError = (errorMessage) => {
    setError(errorMessage);
    setAnalysisData(null);
  };

  const handleReset = () => {
    setAnalysisData(null);
    setCurrentPage('upload');
    setError(null);
  };

  const handleViewHistory = () => {
    setCurrentPage('history');
    setError(null);
  };

  const handleViewTextAnalysis = () => {
    setCurrentPage('text-analysis');
    setError(null);
  };

  const handleViewAnalysis = (analysisData) => {
    setAnalysisData(analysisData);
    setCurrentPage('results');
  };

  const handleBackToUpload = () => {
    setCurrentPage('upload');
    setError(null);
  };

  const handleTextAnalysisComplete = (data) => {
    setAnalysisData(data);
    setCurrentPage('results');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Optional: Page Title/Header */}
        <header className="bg-none">
          <div className="px-8 py-4">
            {/* You can add page title or breadcrumbs here if needed */}
          </div>
        </header>

        <main className="container mx-auto px-8 py-8">
          {/* Global Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
              <div className="flex-1">
                <h3 className="text-red-800 font-medium">Analysis Error</h3>
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

          {/* Page Content */}
          <div className="fade-in">
            {currentPage === 'upload' && (
              <UploadForm 
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}

            {currentPage === 'text-analysis' && (
              <TextAnalysisPage
                onBack={() => handleNavigate('upload')}
                onAnalysisComplete={handleTextAnalysisComplete}
              />
            )}
            
            {currentPage === 'results' && analysisData && (
              <ResultsDisplay 
                data={analysisData} 
                onReset={() => handleNavigate('upload')} 
              />
            )}
            
            {currentPage === 'history' && (
              <HistoryPage 
                onBack={() => handleNavigate('upload')}
                onViewAnalysis={handleViewAnalysis}
              />
            )}
          </div>
        </main>
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="px-8 py-6 text-center text-gray-500 text-sm">
            <p>Voice Analyzer - Powered by Speechmatics, OpenAI & Supabase</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;