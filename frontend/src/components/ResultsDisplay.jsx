import React, { useState } from 'react';
import { Download, User, Bot, TrendingUp, TrendingDown, Clock, MessageSquare, ChevronDown, ChevronUp, Users, ArrowLeft, BarChart3, CheckCircle2 } from 'lucide-react';

const ResultsDisplay = ({ data, onReset }) => {
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, transcript, details
  
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-analysis-${data.call_id || 'transcript'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTranscript = () => {
    const transcriptText = data.full_transcript || 
      (data.utterances || []).map(utterance => {
        const timestamp = `[${Math.floor((utterance.start_time || 0) / 60)}:${String(Math.floor((utterance.start_time || 0) % 60)).padStart(2, '0')}]`;
        return `${timestamp} ${utterance.speaker}: ${utterance.text}`;
      }).join('\n\n');
    
    const blob = new Blob([transcriptText], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${data.call_id || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positif':
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negatif':
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const getSpeakerIcon = (speaker) => {
    if (speaker === 'Agent') {
      return <Bot className="h-5 w-5 text-blue-600" />;
    } else if (speaker === 'Customer') {
      return <User className="h-5 w-5 text-green-600" />;
    }
    return <Users className="h-5 w-5 text-purple-600" />;
  };

  const getSpeakerColor = (speaker) => {
    if (speaker === 'Agent') {
      return 'text-blue-600 bg-blue-50 border-blue-200';
    } else if (speaker === 'Customer') {
      return 'text-green-600 bg-green-50 border-green-200';
    }
    return 'text-purple-600 bg-purple-50 border-purple-200';
  };

  // Function to translate score keys to Indonesian display names
  const getScoreDisplayName = (key) => {
    const translations = {
      // Overall scores
      'keterlibatan_keseluruhan': 'Keterlibatan Keseluruhan',
      'probabilitas_pembelian': 'Probabilitas Pembelian',
      'kualitas_percakapan': 'Kualitas Percakapan',
      
      // Agent scores
      'kesopanan_agen': 'Kesopanan Agen',
      'profesionalisme_agen': 'Profesionalisme',
      'kemampuan_closing': 'Kemampuan Closing',
      'penggunaan_skrip': 'Penggunaan Skrip',
      'empati': 'Empati',
      
      // Customer scores
      'minat_customer': 'Minat Customer',
      'responsivitas': 'Responsivitas',
      'tingkat_keraguan': 'Tingkat Keraguan',
      'potensi_beli': 'Potensi Beli',
      'engagement': 'Engagement',
      
      // Fallback for English keys
      'agent_politeness': 'Kesopanan Agen',
      'customer_interest': 'Minat Customer',
      'purchase_probability': 'Probabilitas Pembelian',
      'agent_professionalism': 'Profesionalisme Agen',
      'overall_engagement': 'Keterlibatan Keseluruhan'
    };
    return translations[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Calculate speaker statistics
  const utterances = data.utterances || data.transcript || [];
  const speakerStats = utterances.reduce((stats, utterance) => {
    const speaker = utterance.speaker;
    if (!stats[speaker]) {
      stats[speaker] = { count: 0, totalWords: 0, totalTime: 0 };
    }
    stats[speaker].count += 1;
    stats[speaker].totalWords += (utterance.text || '').split(' ').length;
    stats[speaker].totalTime += (utterance.end_time || 0) - (utterance.start_time || 0);
    return stats;
  }, {});

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Ringkasan', icon: BarChart3 },
    { id: 'transcript', label: 'Transkrip', icon: MessageSquare },
    { id: 'details', label: 'Detail Analisis', icon: TrendingUp }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <button
                onClick={onReset}
                className="inline-flex items-center text-gray-600 hover:text-gray-800 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Kembali
              </button>
              <div className="h-8 w-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Hasil Analisis Transkrip
            </h1>
            <div className="space-y-1 text-sm text-gray-600">
              <p>ID Panggilan: <span className="font-medium">{data.call_id || 'N/A'}</span></p>
              {data.speakers && (
                <p>Pembicara: <span className="font-medium">{data.speakers.join(', ')}</span></p>
              )}
              {utterances && (
                <p>Total Segmen: <span className="font-medium">{utterances.length}</span></p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={downloadTranscript}
              className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Unduh Transkrip
            </button>
            <button
              onClick={downloadJSON}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Unduh Laporan
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6 fade-in">
            {/* Speaker Statistics */}
            {Object.keys(speakerStats).length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Statistik Pembicara</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(speakerStats).map(([speaker, stats]) => (
                    <div key={speaker} className={`p-4 rounded-lg border-2 ${getSpeakerColor(speaker)}`}>
                      <div className="flex items-center mb-2">
                        {getSpeakerIcon(speaker)}
                        <h3 className="text-lg font-semibold ml-2">{speaker}</h3>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><strong>Segmen:</strong> {stats.count}</p>
                        <p><strong>Kata:</strong> {stats.totalWords}</p>
                        <p><strong>Durasi:</strong> {Math.round(stats.totalTime)}s</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Scores */}
            {data.scores && Object.keys(data.scores).length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Skor Keseluruhan</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(data.scores || {}).map(([key, value]) => (
                    <div key={key} className="relative">
                      <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          {getScoreDisplayName(key)}
                        </h3>
                        <div className="flex items-end justify-between">
                          <div className="flex items-baseline">
                            <span className={`text-4xl font-bold ${getScoreColor(value).replace('bg-', 'text-').replace('-100', '-600')}`}>
                              {value}
                            </span>
                            <span className="text-gray-500 ml-2 text-lg">/100</span>
                          </div>
                          <div className={`w-16 h-16 rounded-full ${getScoreColor(value)} flex items-center justify-center`}>
                            <span className="text-2xl font-bold">
                              {value >= 80 ? '🎉' : value >= 60 ? '👍' : '⚠️'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-1000 ${
                                value >= 80 ? 'bg-green-600' : value >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent and Customer Scores */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Agent Scores */}
              {data.agent_scores && Object.keys(data.agent_scores).length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Bot className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Penilaian Agent</h3>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(data.agent_scores).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">{getScoreDisplayName(key)}</span>
                          <span className="font-bold text-gray-900">{value}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-1000 ${
                              value >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                              value >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                              'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Scores */}
              {data.customer_scores && Object.keys(data.customer_scores).length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Penilaian Customer</h3>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(data.customer_scores).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">{getScoreDisplayName(key)}</span>
                          <span className="font-bold text-gray-900">{value}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-1000 ${
                              value >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                              value >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                              'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transcript Tab */}
        {activeTab === 'transcript' && (
          <div className="space-y-6 fade-in">
            {/* Enhanced Transcript Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <MessageSquare className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Transkrip Percakapan</h3>
                    <p className="text-sm text-gray-600">{utterances.length} segmen percakapan</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {utterances.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {utterances.map((utterance, index) => (
                      <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex-shrink-0 mt-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getSpeakerColor(utterance.speaker)}`}>
                            {getSpeakerIcon(utterance.speaker)}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <span className={`font-semibold ${
                                utterance.speaker === 'Agent' ? 'text-blue-600' : 
                                utterance.speaker === 'Customer' ? 'text-green-600' : 'text-purple-600'
                              }`}>
                                {utterance.speaker}
                              </span>
                              {utterance.start_time !== undefined && (
                                <span className="flex items-center text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                                  <Clock className="h-3 w-3 mr-1" />
                                  [{Math.floor((utterance.start_time || 0) / 60)}:{String(Math.floor((utterance.start_time || 0) % 60)).padStart(2, '0')}]
                                </span>
                              )}
                            </div>
                            {utterance.confidence && (
                              <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-full">
                                {Math.round(utterance.confidence * 100)}% akurasi
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-800 leading-relaxed bg-white p-3 rounded-lg shadow-sm">
                            {utterance.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <div className="text-gray-500">
                      <p className="text-lg font-medium mb-2">Transkrip tidak tersedia</p>
                      <p>Transkrip belum diproses atau tidak ditemukan dalam hasil analisis</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-6 fade-in">
            {/* Insights & Recommendations */}
            {((data.insights && data.insights.length > 0) || (data.recommendations && data.recommendations.length > 0)) && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {data.insights && data.insights.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">Wawasan Utama</h3>
                    </div>
                    <div className="space-y-4">
                      {data.insights.map((insight, index) => (
                        <div key={index} className="flex items-start p-4 bg-blue-50 rounded-lg">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                            <span className="text-white text-xs font-bold">{index + 1}</span>
                          </div>
                          <span className="text-gray-700 leading-relaxed">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.recommendations && data.recommendations.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex items-center mb-6">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">Rekomendasi</h3>
                    </div>
                    <div className="space-y-4">
                      {data.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start p-4 bg-green-50 rounded-lg">
                          <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                            <span className="text-white text-xs font-bold">{index + 1}</span>
                          </div>
                          <span className="text-gray-700 leading-relaxed">{recommendation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Summary */}
            {data.summary && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Ringkasan Lengkap</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'estimasi_durasi_total', label: 'Durasi Percakapan', value: data.summary.estimasi_durasi_total || data.summary.total_duration_estimate },
                    { key: 'pembicara_dominan', label: 'Pembicara Dominan', value: data.summary.pembicara_dominan || data.summary.dominant_speaker },
                    { key: 'alur_percakapan', label: 'Alur Percakapan', value: data.summary.alur_percakapan || data.summary.conversation_flow, fullWidth: true },
                    { key: 'prediksi_hasil', label: 'Prediksi Hasil', value: data.summary.prediksi_hasil || data.summary.outcome_prediction, fullWidth: true }
                  ].map((item) => (
                    <div key={item.key} className={item.fullWidth ? 'md:col-span-2' : ''}>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 font-medium mb-2">{item.label}</p>
                        <p className="text-gray-900 leading-relaxed">{item.value || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                  
                  {data.summary.poin_penting && (
                    <div className="md:col-span-2">
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-gray-600 font-medium mb-3">Poin Penting</p>
                        <div className="space-y-2">
                          {data.summary.poin_penting.map((point, index) => (
                            <div key={index} className="flex items-start">
                              <span className="inline-block w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                              <span className="text-gray-700">{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {data.summary.next_action && (
                    <div className="md:col-span-2">
                      <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                        <p className="text-sm text-gray-600 font-medium mb-2">Langkah Selanjutnya</p>
                        <p className="text-blue-800 font-medium">{data.summary.next_action}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsDisplay;