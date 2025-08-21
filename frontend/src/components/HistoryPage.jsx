import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Trash2, 
  FileAudio, 
  Calendar, 
  Clock, 
  Eye,
  Search,
  Filter,
  BarChart3,
  Database,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { getAnalysisHistory, deleteAnalysis, getStorageStats } from '../services/api';

const HistoryPage = ({ onBack, onViewAnalysis }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadHistory();
    loadStats();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await getAnalysisHistory(100, 0);
      setHistory(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Gagal memuat riwayat analisis');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getStorageStats();
      setStats(response.data.data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAnalysis(id);
      setHistory(history.filter(item => item.id !== id));
      setDeleteConfirm(null);
      loadStats(); // Refresh stats
    } catch (err) {
      console.error('Error deleting analysis:', err);
      setError('Gagal menghapus analisis');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedItems.map(id => deleteAnalysis(id)));
      setHistory(history.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      loadStats();
    } catch (err) {
      console.error('Error bulk deleting:', err);
      setError('Gagal menghapus beberapa analisis');
    }
  };

  const downloadJSON = (analysis) => {
    const blob = new Blob([JSON.stringify(analysis.analysis_json, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${analysis.call_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTranscript = (analysis) => {
    const blob = new Blob([analysis.transcript_text || ''], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${analysis.call_id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getScoreColor = (score) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredAndSortedHistory = history
    .filter(item => 
      item.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.call_id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'created_at') {
        return sortOrder === 'desc' 
          ? new Date(b.created_at) - new Date(a.created_at)
          : new Date(a.created_at) - new Date(b.created_at);
      }
      if (sortBy === 'filename') {
        return sortOrder === 'desc'
          ? b.original_filename.localeCompare(a.original_filename)
          : a.original_filename.localeCompare(b.original_filename);
      }
      if (sortBy === 'score') {
        const scoreA = a.overall_scores?.keterlibatan_keseluruhan || 0;
        const scoreB = b.overall_scores?.keterlibatan_keseluruhan || 0;
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat riwayat analisis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-none sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
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
                <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Riwayat Analisis</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={loadHistory}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              {selectedItems.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus ({selectedItems.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <FileAudio className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total File Audio</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFiles}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <Database className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Storage Digunakan</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSizeMB} MB</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Analisis</p>
                  <p className="text-2xl font-bold text-gray-900">{history.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama file atau call ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="created_at">Tanggal</option>
                  <option value="filename">Nama File</option>
                  <option value="score">Skor</option>
                </select>
              </div>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                {sortOrder === 'desc' ? '↓ Desc' : '↑ Asc'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* History List */}
        {filteredAndSortedHistory.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Riwayat</h3>
            <p className="text-gray-500">Mulai upload dan analisis file audio untuk melihat riwayat di sini</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedHistory.map((analysis) => (
              <div key={analysis.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(analysis.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, analysis.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== analysis.id));
                        }
                      }}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileAudio className="h-6 w-6 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {analysis.original_filename}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(analysis.created_at)}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {analysis.duration_estimate ? `${analysis.duration_estimate}s` : 'N/A'}
                        </span>
                        <span>{formatFileSize(analysis.file_size)}</span>
                      </div>
                      
                      {/* Scores Preview */}
                      {analysis.overall_scores && (
                        <div className="flex items-center space-x-4 mt-3">
                          <div className="flex items-center">
                            <span className="text-xs text-gray-600 mr-2">Keterlibatan:</span>
                            <span className={`font-semibold ${getScoreColor(analysis.overall_scores.keterlibatan_keseluruhan)}`}>
                              {analysis.overall_scores.keterlibatan_keseluruhan}/100
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-600 mr-2">Prob. Beli:</span>
                            <span className={`font-semibold ${getScoreColor(analysis.overall_scores.probabilitas_pembelian)}`}>
                              {analysis.overall_scores.probabilitas_pembelian}/100
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onViewAnalysis(analysis.analysis_json)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Lihat Detail"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => downloadJSON(analysis)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Download JSON"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => downloadTranscript(analysis)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Download Transkrip"
                    >
                      <FileAudio className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => setDeleteConfirm(analysis.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Konfirmasi Hapus</h3>
              <p className="text-gray-600 mb-6">
                Apakah Anda yakin ingin menghapus analisis ini? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
