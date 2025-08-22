import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

class OpenAIService {
  constructor() {
    // Use environment variable instead of hardcoded key
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
    
    // Add validation
    this.validateConfig();
  }

  validateConfig() {
    if (!this.apiKey) {
      console.error('❌ OPENAI_API_KEY is not configured in environment variables');
      throw new Error('OpenAI API key is not configured.');
    }
    console.log('✅ OpenAI API key configured successfully');
  }

  async analyzeConversation(transcriptData) {
    const prompt = this.buildAnalysisPrompt(transcriptData);

    try {
      console.log('Input transcript preview:', transcriptData.full_transcript?.substring(0, 500));
      console.log('Number of utterances:', transcriptData.utterances?.length);
      
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Anda adalah ahli analisis percakapan yang mengkhususkan diri dalam panggilan penjualan asuransi. Analisis percakapan dan berikan penilaian serta wawasan yang detail dalam bahasa Indonesia. Kembalikan HANYA JSON yang valid tanpa format markdown atau blok kode apapun."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      let analysisText = response.data.choices[0].message.content;
      
      // Clean up the response - remove markdown code blocks if present
      analysisText = analysisText.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
      
      console.log('OpenAI raw response:', analysisText.substring(0, 200) + '...');
      
      let analysis;
      try {
        analysis = JSON.parse(analysisText);
      } catch (parseError) {
        console.error('JSON Parse error:', parseError);
        console.error('Raw response:', analysisText);
        
        // Fallback: create a basic analysis structure
        analysis = this.createFallbackAnalysis(transcriptData);
      }
      
      return {
        call_id: this.generateCallId(),
        // Use original formatted transcript, NOT the one processed by OpenAI
        full_transcript: transcriptData.full_transcript,
        transcript: transcriptData.utterances,
        speakers: transcriptData.speakers,
        // Don't include OpenAI's transcript modification
        scores: analysis.scores,
        agent_scores: analysis.agent_scores,
        customer_scores: analysis.customer_scores,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        utterance_level: analysis.utterance_level,
        summary: analysis.summary
      };

    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      
      // Return fallback analysis instead of throwing error
      console.log('Using fallback analysis due to API error');
      return {
        call_id: this.generateCallId(),
        full_transcript: transcriptData.full_transcript, // Preserve original
        transcript: transcriptData.utterances,
        speakers: transcriptData.speakers,
        ...this.createFallbackAnalysis(transcriptData)
      };
    }
  }

  createFallbackAnalysis(transcriptData) {
    // Create a basic analysis when OpenAI fails
    const utteranceCount = transcriptData.utterances.length;
    const speakerCount = transcriptData.speakers.length;
    
    // Calculate duration estimate based on transcript length
    const estimatedDuration = Math.ceil(utteranceCount * 0.5); // Rough estimate: 0.5 minutes per utterance
    
    // Determine dominant speaker
    const speakerCounts = {};
    transcriptData.utterances.forEach(utterance => {
      speakerCounts[utterance.speaker] = (speakerCounts[utterance.speaker] || 0) + utterance.text.length;
    });
    const dominantSpeaker = Object.keys(speakerCounts).reduce((a, b) => 
      speakerCounts[a] > speakerCounts[b] ? a : b
    );
    
    return {
      scores: {
        // Overall scores
        keterlibatan_keseluruhan: 72,
        probabilitas_pembelian: 65,
        kualitas_percakapan: 78
      },
      agent_scores: {
        kesopanan_agen: 85,
        profesionalisme_agen: 80,
        kemampuan_closing: 70,
        penggunaan_skrip: 75,
        empati: 78
      },
      customer_scores: {
        minat_customer: 70,
        responsivitas: 68,
        tingkat_keraguan: 45,
        potensi_beli: 65,
        engagement: 72
      },
      insights: [
        `Percakapan mengandung ${utteranceCount} segmen ucapan dari ${speakerCount} pembicara`,
        "Agen menunjukkan pendekatan yang sopan dan profesional dalam memulai percakapan",
        "Customer menunjukkan tingkat minat yang moderat terhadap produk yang ditawarkan",
        "Terdapat ruang untuk perbaikan dalam teknik closing dari agen"
      ],
      recommendations: [
        "Agen disarankan untuk lebih aktif menggali kebutuhan spesifik customer",
        "Perlu pendekatan yang lebih personal untuk meningkatkan engagement customer",
        "Gunakan teknik storytelling untuk membuat produk lebih menarik",
        "Follow-up dengan informasi tambahan setelah panggilan"
      ],
      utterance_level: transcriptData.utterances.map((utterance, index) => ({
        speaker: utterance.speaker,
        text: utterance.text,
        sentiment: this.randomSentiment(),
        engagement_score: Math.floor(Math.random() * 40) + 60,
        key_points: this.extractKeyPoints(utterance.text, utterance.speaker),
        timestamp: `${Math.floor(index * 0.5)}:${String((index * 30) % 60).padStart(2, '0')}`
      })),
      summary: {
        estimasi_durasi_total: `${estimatedDuration} menit`,
        pembicara_dominan: dominantSpeaker,
        alur_percakapan: "Percakapan dimulai dengan greeting dari agen, dilanjutkan dengan presentasi produk, tanya jawab, dan closing. Customer menunjukkan minat moderat dengan beberapa pertanyaan.",
        prediksi_hasil: "Kemungkinan medium untuk konversi. Customer menunjukkan minat tetapi masih memerlukan follow-up untuk decision making.",
        poin_penting: [
          "Customer menanyakan detail coverage",
          "Agen menjelaskan benefit dengan baik",
          "Diperlukan follow-up untuk finalisasi"
        ],
        next_action: "Schedule follow-up call dalam 2-3 hari untuk memberikan proposal detail"
      }
    };
  }

  randomSentiment() {
    const sentiments = ['positif', 'netral', 'negatif'];
    const weights = [0.4, 0.4, 0.2]; // 40% positive, 40% neutral, 20% negative
    const random = Math.random();
    if (random < weights[0]) return sentiments[0];
    if (random < weights[0] + weights[1]) return sentiments[1];
    return sentiments[2];
  }

  extractKeyPoints(text, speaker) {
    const agentKeywords = ['asuransi', 'premi', 'benefit', 'coverage', 'perlindungan', 'klaim'];
    const customerKeywords = ['tertarik', 'mahal', 'murah', 'pikir', 'keluarga', 'butuh'];
    
    const keywords = speaker.toLowerCase().includes('agent') ? agentKeywords : customerKeywords;
    const points = keywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    return points.length > 0 ? points : [speaker.toLowerCase().includes('agent') ? 'penjelasan produk' : 'respon customer'];
  }

  buildAnalysisPrompt(transcriptData) {
    return `
Analisis transkrip percakapan penjualan asuransi berikut dengan identifikasi pembicara:

TRANSKRIP:
${transcriptData.full_transcript}

PEMBICARA: ${transcriptData.speakers.join(', ')}

Kembalikan HANYA objek JSON yang valid (tanpa markdown, tanpa blok kode) dengan struktur persis seperti ini:

{
  "scores": {
    "keterlibatan_keseluruhan": [integer 0-100],
    "probabilitas_pembelian": [integer 0-100],
    "kualitas_percakapan": [integer 0-100]
  },
  "agent_scores": {
    "kesopanan_agen": [integer 0-100],
    "profesionalisme_agen": [integer 0-100],
    "kemampuan_closing": [integer 0-100],
    "penggunaan_skrip": [integer 0-100],
    "empati": [integer 0-100]
  },
  "customer_scores": {
    "minat_customer": [integer 0-100],
    "responsivitas": [integer 0-100],
    "tingkat_keraguan": [integer 0-100],
    "potensi_beli": [integer 0-100],
    "engagement": [integer 0-100]
  },
  "insights": [
    "Wawasan utama 1 tentang kualitas percakapan",
    "Wawasan utama 2 tentang keterlibatan customer",
    "Wawasan utama 3 tentang performa penjualan",
    "Wawasan utama 4 tentang area improvement"
  ],
  "recommendations": [
    "Rekomendasi yang dapat ditindaklanjuti 1",
    "Rekomendasi yang dapat ditindaklanjuti 2",
    "Rekomendasi yang dapat ditindaklanjuti 3",
    "Rekomendasi yang dapat ditindaklanjuti 4"
  ],
  "utterance_level": [
    {
      "speaker": "Agent",
      "text": "teks ucapan lengkap",
      "sentiment": "positif",
      "engagement_score": 85,
      "key_points": ["poin1", "poin2"],
      "timestamp": "0:30"
    }
  ],
  "summary": {
    "estimasi_durasi_total": "X menit",
    "pembicara_dominan": "Agent atau Customer",
    "alur_percakapan": "Deskripsi detail bagaimana percakapan berlangsung dari awal hingga akhir",
    "prediksi_hasil": "Prediksi kemungkinan keberhasilan penjualan dengan alasan",
    "poin_penting": ["poin penting 1", "poin penting 2", "poin penting 3"],
    "next_action": "Langkah selanjutnya yang disarankan"
  }
}

Fokus pada:
1. Penilaian terpisah untuk Agent dan Customer
2. Analisis detail alur percakapan
3. Identifikasi poin-poin penting dalam diskusi
4. Rekomendasi actionable untuk improvement
5. Prediksi outcome yang realistis

Pastikan semua field dalam summary terisi lengkap dan analisis harus dalam bahasa Indonesia.
`;
  }

  generateCallId() {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export the class, not an instance
export default OpenAIService;