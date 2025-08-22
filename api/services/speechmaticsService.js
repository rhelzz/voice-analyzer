import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

dotenv.config();

class SpeechmaticsService {
  constructor() {
    // Use environment variable instead of hardcoded key
    this.apiKey = process.env.SPEECHMATICS_API_KEY;
    this.baseURL = 'https://asr.api.speechmatics.com/v2';
    
    // Add validation at startup
    this.validateConfig();
  }

  validateConfig() {
    if (!this.apiKey) {
      console.error('❌ SPEECHMATICS_API_KEY is not configured in environment variables');
      throw new Error('Speechmatics API key is not configured.');
    }
    console.log('✅ Speechmatics API key configured successfully');
  }

  async transcribeWithDiarization(filePath, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Transcription attempt ${attempt + 1}/${maxRetries}`);
        
        const result = await this.performTranscription(filePath);
        
        // Validate speaker consistency
        if (this.validateSpeakerConsistency(result)) {
          console.log('✅ Speaker diarization validation passed');
          return result;
        } else {
          console.log('⚠️ Speaker diarization inconsistent, retrying...');
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            continue;
          }
        }
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt + 1} failed:`, error.message);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        }
      }
    }
    
    throw lastError || new Error('All transcription attempts failed');
  }

  validateSpeakerConsistency(transcriptData) {
    const utterances = transcriptData.utterances || [];
    if (utterances.length === 0) return false;
    
    // Check if we have reasonable speaker distribution
    const speakerCounts = {};
    utterances.forEach(utterance => {
      speakerCounts[utterance.speaker] = (speakerCounts[utterance.speaker] || 0) + 1;
    });
    
    const speakers = Object.keys(speakerCounts);
    
    // Should have 2 main speakers in a conversation
    if (speakers.length < 2) {
      console.log('⚠️ Only one speaker detected, may need intelligent splitting');
      return speakers.length === 1; // Still valid, will be handled later
    }
    
    if (speakers.length > 3) {
      console.log('⚠️ Too many speakers detected:', speakers.length);
      return false;
    }
    
    // Check if speaker labels are reasonable (not too many different speakers)
    const totalUtterances = utterances.length;
    const mainSpeakers = speakers.filter(speaker => 
      speakerCounts[speaker] / totalUtterances > 0.1 // At least 10% of conversation
    );
    
    return mainSpeakers.length >= 1 && mainSpeakers.length <= 3;
  }

  async performTranscription(filePath) {
    // Existing transcription logic but with enhanced config
    const formData = new FormData();
    formData.append('data_file', fs.createReadStream(filePath));
    
    // Enhanced configuration for more consistent results
    const config = {
      type: 'transcription',
      transcription_config: {
        language: 'id',
        diarization: 'speaker',
        operating_point: 'enhanced',
        speaker_diarization_config: {
          speaker_sensitivity: 0.5, // Reduce sensitivity for more stable results
          prefer_current_speaker: true, // Prefer current speaker to reduce switching
          max_speakers: 3 // Limit maximum speakers
        },
        punctuation_overrides: {
          sensitivity: 0.8
        },
        // Add additional stability settings
        additional_vocab: [], 
        domain: 'telephony' // Optimize for phone conversations
      }
    };
    
    formData.append('config', JSON.stringify(config));
    
    const response = await axios.post(`${this.baseURL}/jobs`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });
    
    const jobId = response.data.id;
    return await this.pollForResults(jobId);
  }

  async transcribeWithDiarization(filePath) {
    try {
      console.log('Using API key:', this.apiKey ? 'Present' : 'Missing');
      
      const formData = new FormData();
      
      // Add audio file
      formData.append('data_file', fs.createReadStream(filePath));
      
      // Improved configuration for better diarization - using exact same config as working code
      const config = {
        type: 'transcription',
        transcription_config: {
          language: 'id', // Indonesian language
          diarization: 'speaker', // Use speaker diarization for stereo/multi-speaker detection
          operating_point: 'enhanced', // Use enhanced for better accuracy
          // Add speaker diarization configuration for better results
          speaker_diarization_config: {
            speaker_sensitivity: 0.7, // Higher sensitivity for better speaker detection
            prefer_current_speaker: false // Allow more speaker switches for contact center
          },
          // Enable punctuation for better diarization accuracy
          punctuation_overrides: {
            sensitivity: 0.8
          }
        }
      };
      
      formData.append('config', JSON.stringify(config));

      const response = await axios.post(`${this.baseURL}/jobs`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      const jobId = response.data.id;
      console.log('Transcription job created:', jobId);
      
      // Poll for results
      return await this.pollForResults(jobId);
      
    } catch (error) {
      console.error('Speechmatics API error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        apiKeyPresent: !!this.apiKey
      });
      throw new Error(`Failed to transcribe audio: ${error.response?.data?.detail || error.message}`);
    }
  }

  async pollForResults(jobId, maxAttempts = 60, interval = 5000) {
    console.log(`Polling for results (job: ${jobId})...`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get(`${this.baseURL}/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        });

        const status = response.data.job.status;
        console.log(`Attempt ${attempt + 1}: Job status is ${status}`);
        
        if (status === 'done') {
          console.log('Transcription completed, fetching transcript...');
          // Get transcript using json-v2 format for better diarization support
          const transcriptResponse = await axios.get(
            `${this.baseURL}/jobs/${jobId}/transcript?format=json-v2`,
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`
              }
            }
          );
          
          return this.formatTranscript(transcriptResponse.data);
        } else if (status === 'rejected') {
          throw new Error(`Transcription job was rejected: ${response.data.job.errors?.[0] || 'Unknown error'}`);
        } else if (status === 'running') {
          console.log('Job is still running, waiting...');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, interval));
        
      } catch (error) {
        console.error('Polling error:', error.message);
        throw error;
      }
    }
    
    throw new Error('Transcription timeout - job took too long to complete');
  }

  formatTranscript(rawTranscript) {
    console.log('Formatting transcript data...');
    
    const results = rawTranscript.results || [];
    if (results.length === 0) {
      return this.getEmptyTranscript();
    }

    const wordData = this.extractWordData(results);
    const speakerMapping = this.createStableSpeakerMapping(wordData);
    const utterances = this.groupIntoUtterances(wordData, speakerMapping);
    const finalUtterances = this.applySpeakerLogic(utterances);
    
    return this.buildFinalTranscript(finalUtterances);
  }

  createStableSpeakerMapping(wordData) {
    const detectedSpeakers = [...new Set(wordData.map(w => w.speaker))].filter(Boolean);
    console.log('Raw detected speakers:', detectedSpeakers);
    
    // Analyze speaker patterns for more stable mapping
    const speakerStats = this.analyzeSpeakerPatterns(wordData);
    console.log('Speaker statistics:', speakerStats);
    
    const speakerMap = new Map();
    
    if (detectedSpeakers.length === 2) {
      // Determine who is likely the agent based on conversation patterns
      const [speaker1, speaker2] = detectedSpeakers;
      const stats1 = speakerStats[speaker1];
      const stats2 = speakerStats[speaker2];
      
      // Agent typically starts conversation and speaks longer
      const speaker1IsAgent = (
        stats1.startsFirst ||
        stats1.avgWordsPerUtterance > stats2.avgWordsPerUtterance ||
        this.hasAgentLanguagePatterns(stats1.words)
      );
      
      if (speaker1IsAgent) {
        speakerMap.set(speaker1, 'Agent');
        speakerMap.set(speaker2, 'Customer');
      } else {
        speakerMap.set(speaker1, 'Customer');
        speakerMap.set(speaker2, 'Agent');
      }
    } else {
      // Fallback for other cases
      detectedSpeakers.forEach((speaker, index) => {
        if (index === 0) speakerMap.set(speaker, 'Agent');
        else if (index === 1) speakerMap.set(speaker, 'Customer');
        else speakerMap.set(speaker, `Speaker_${index + 1}`);
      });
    }
    
    console.log('Final speaker mapping:', Array.from(speakerMap.entries()));
    return speakerMap;
  }

  analyzeSpeakerPatterns(wordData) {
    const patterns = {};
    
    wordData.forEach((word, index) => {
      if (!patterns[word.speaker]) {
        patterns[word.speaker] = {
          words: [],
          utteranceCount: 0,
          totalWords: 0,
          startsFirst: index === 0,
          avgWordsPerUtterance: 0
        };
      }
      
      patterns[word.speaker].words.push(word.word.toLowerCase());
      patterns[word.speaker].totalWords++;
    });
    
    // Calculate averages and patterns
    Object.keys(patterns).forEach(speaker => {
      const stats = patterns[speaker];
      stats.avgWordsPerUtterance = stats.totalWords / Math.max(stats.utteranceCount, 1);
    });
    
    return patterns;
  }

  hasAgentLanguagePatterns(words) {
    const agentKeywords = [
      'selamat', 'perkenalkan', 'saya', 'dari', 'pt', 'perusahaan',
      'kami', 'produk', 'asuransi', 'terima kasih', 'membantu',
      'informasi', 'manfaat', 'premi', 'polis'
    ];
    
    const wordString = words.join(' ');
    const agentMatches = agentKeywords.filter(keyword => 
      wordString.includes(keyword)
    ).length;
    
    return agentMatches >= 3; // Threshold for agent identification
  }

  extractWordData(results) {
    // Collect all words with their speaker information - exact same logic as working code
    return results
      .filter(result => result.type === 'word' && result.alternatives?.[0]?.content)
      .map(result => ({
        word: result.alternatives[0].content,
        speaker: result.alternatives[0].speaker || result.speaker || 'S1',
        confidence: result.alternatives[0].confidence || 0.9,
        start_time: result.start_time || 0,
        end_time: result.end_time || 0
      }));
  }

  groupIntoUtterances(wordData, speakerMapping) {
    // Group words into utterances based on speaker changes and timing
    const utterances = [];
    let currentSpeaker = null;
    let currentWords = [];
    let currentStartTime = 0;
    let lastEndTime = 0;

    wordData.forEach((wordInfo, index) => {
      const speakerLabel = speakerMapping.get(wordInfo.speaker) || 'Agent';
      const timePause = wordInfo.start_time - lastEndTime > 2.0; // 2 second pause threshold
      const speakerChange = speakerLabel !== currentSpeaker;

      // Start new utterance if speaker changes or significant pause
      if ((speakerChange || timePause) && currentWords.length > 0) {
        // Save current utterance
        const text = currentWords.map(w => w.word).join(' ').trim();
        if (text.length > 0) {
          utterances.push({
            speaker: currentSpeaker,
            text: text,
            start_time: currentStartTime,
            end_time: lastEndTime,
            confidence: currentWords.reduce((sum, w) => sum + w.confidence, 0) / currentWords.length
          });
        }
        
        // Reset for new utterance
        currentWords = [];
      }

      // Start new utterance or continue current
      if (currentWords.length === 0) {
        currentSpeaker = speakerLabel;
        currentStartTime = wordInfo.start_time;
      }
      
      currentWords.push(wordInfo);
      lastEndTime = wordInfo.end_time;
    });

    // Don't forget the last utterance
    if (currentWords.length > 0) {
      const text = currentWords.map(w => w.word).join(' ').trim();
      if (text.length > 0) {
        utterances.push({
          speaker: currentSpeaker,
          text: text,
          start_time: currentStartTime,
          end_time: lastEndTime,
          confidence: currentWords.reduce((sum, w) => sum + w.confidence, 0) / currentWords.length
        });
      }
    }

    return utterances;
  }

  applySpeakerLogic(utterances) {
    // Apply business logic for conversation flow
    return utterances.map((utterance, index) => {
      // Agent typically starts conversations
      if (index === 0 && utterance.text.toLowerCase().includes('selamat')) {
        utterance.speaker = 'Agent';
      }
      
      // Customer responses are typically shorter and more casual
      if (utterance.text.length < 50 && 
          (utterance.text.toLowerCase().includes('ya') || 
           utterance.text.toLowerCase().includes('tidak') ||
           utterance.text.toLowerCase().includes('iya'))) {
        utterance.speaker = 'Customer';
      }
      
      return utterance;
    });
  }

  buildFinalTranscript(utterances) {
    // Generate formatted transcript
    const fullTranscript = utterances.length > 0 
      ? utterances.map(utterance => {
          const timestamp = `[${this.formatTimestamp(utterance.start_time)}]`;
          return `${timestamp} ${utterance.speaker}: ${utterance.text}`;
        }).join('\n\n')
      : 'Tidak ada transkrip tersedia';

    const speakerDistribution = utterances.reduce((acc, u) => {
      acc[u.speaker] = (acc[u.speaker] || 0) + 1;
      return acc;
    }, {});

    console.log(`✅ Formatted transcript with ${utterances.length} utterances`);
    console.log('Final speaker distribution:', speakerDistribution);

    return {
      speakers: ['Agent', 'Customer'], // Always return both speakers
      utterances: utterances,
      full_transcript: fullTranscript
    };
  }

  getEmptyTranscript() {
    return {
      speakers: ['Agent', 'Customer'],
      utterances: [],
      full_transcript: 'Tidak ada transkrip tersedia'
    };
  }

  classifySpeaker(text, index, totalUtterances) {
    const textLower = text.toLowerCase();
    
    // Agent indicators (more formal, product-focused language)
    const agentIndicators = [
      'selamat', 'bapak', 'ibu', 'kami', 'perusahaan', 'produk', 'asuransi', 
      'manfaat', 'premi', 'perlindungan', 'terima kasih', 'mari kita', 'saya akan',
      'membantu', 'layanan', 'penawaran', 'harga', 'paket', 'benefit'
    ];

    // Customer indicators (more casual, questioning language)
    const customerIndicators = [
      'ya', 'tidak', 'iya', 'saya tertarik', 'berapa', 'bagaimana', 'boleh', 
      'bisa', 'mau', 'nggak', 'gimana', 'oh', 'oke', 'baik', 'saya mau',
      'kapan', 'dimana', 'kenapa', 'wah', 'hmm'
    ];

    // Calculate indicator scores
    const agentScore = agentIndicators.filter(indicator => textLower.includes(indicator)).length;
    const customerScore = customerIndicators.filter(indicator => textLower.includes(indicator)).length;

    // Additional heuristics
    const isLongUtterance = text.length > 80; // Agents typically speak longer
    const hasQuestions = /\?/.test(text) || /berapa|bagaimana|kapan|dimana|kenapa/.test(textLower);
    const isFirstUtterance = index === 0; // Agent usually starts
    
    // Scoring system
    let agentPoints = agentScore * 2;
    let customerPoints = customerScore * 2;
    
    if (isLongUtterance) agentPoints += 1;
    if (hasQuestions) customerPoints += 2;
    if (isFirstUtterance) agentPoints += 1;
    
    // Short responses are likely customer
    if (text.length < 20 && (textLower.includes('ya') || textLower.includes('tidak'))) {
      customerPoints += 3;
    }

    return customerPoints > agentPoints ? 'Customer' : 'Agent';
  }

  mergeConsecutiveSpeakers(utterances) {
    const merged = [];
    let current = null;

    utterances.forEach(utterance => {
      if (current && current.speaker === utterance.speaker) {
        // Merge with previous utterance
        current.text += ' ' + utterance.text;
        current.end_time = utterance.end_time;
        current.confidence = (current.confidence + utterance.confidence) / 2;
      } else {
        // Start new utterance
        if (current) merged.push(current);
        current = { ...utterance };
      }
    });

    if (current) merged.push(current);
    
    // Filter out very short utterances (likely noise)
    return merged.filter(utterance => utterance.text.trim().length >= 3);
  }

  formatTimestamp(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Export the class, not an instance
export default SpeechmaticsService;