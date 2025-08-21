import express from 'express';
import { upload } from '../middleware/fileUpload.js';
import SpeechmaticsService from '../services/speechmaticsService.js';
import OpenAIService from '../services/openaiService.js';
import supabaseService from '../services/supabaseService.js';
import fs from 'fs';

const router = express.Router();

// Create service instances (environment should be loaded by now)
const speechmaticsService = new SpeechmaticsService();
const openaiService = new OpenAIService();

router.post('/upload', upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    
    console.log('Starting transcription with retry logic...');
    let transcriptData;
    
    try {
      // Try with retry logic
      transcriptData = await speechmaticsService.transcribeWithDiarization(filePath, 3);
    } catch (transcriptionError) {
      console.error('Transcription failed after retries:', transcriptionError);
      
      // Create fallback transcript structure
      transcriptData = {
        speakers: ['Agent', 'Customer'],
        utterances: [{
          speaker: 'Agent',
          text: 'Transkrip tidak dapat diproses dengan akurat. Silakan coba upload ulang atau gunakan file dengan kualitas audio yang lebih baik.',
          start_time: 0,
          end_time: 30,
          confidence: 0.5
        }],
        full_transcript: '[0:00] Agent: Transkrip tidak dapat diproses dengan akurat.'
      };
    }
    
    // Step 2: Analyze with OpenAI
    console.log('Starting analysis...');
    const analysis = await openaiService.analyzeConversation(transcriptData);
    
    // Step 3: Upload audio file to Supabase
    console.log('Uploading to Supabase...');
    const audioFileInfo = await supabaseService.uploadAudioFile(filePath, originalFilename);
    audioFileInfo.size = req.file.size;
    
    // Step 4: Save analysis result to Supabase
    const savedRecord = await supabaseService.saveAnalysisResult(
      analysis, 
      audioFileInfo, 
      originalFilename
    );
    
    // Clean up local uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      data: {
        ...analysis,
        supabase_id: savedRecord.id,
        audio_url: audioFileInfo.publicUrl
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// New text analysis route
router.post('/analyze-text', upload.single('textFile'), async (req, res) => {
  try {
    let transcriptText = '';
    let originalFilename = '';

    // Handle file upload or direct text input
    if (req.file) {
      const filePath = req.file.path;
      originalFilename = req.file.originalname;
      
      // Read text file content
      transcriptText = fs.readFileSync(filePath, 'utf8');
      
      // Clean up uploaded file
      fs.unlinkSync(filePath);
    } else if (req.body.transcriptText) {
      // Direct text input
      transcriptText = req.body.transcriptText;
      originalFilename = req.body.filename || `transcript-${Date.now()}.txt`;
    } else {
      return res.status(400).json({ error: 'No text file or transcript provided' });
    }

    if (!transcriptText.trim()) {
      return res.status(400).json({ error: 'Transcript text is empty' });
    }

    // Parse transcript into structured format
    const parsedTranscript = parseTranscriptText(transcriptText);
    
    // Analyze with OpenAI
    console.log('Starting text analysis...');
    const analysis = await openaiService.analyzeConversation(parsedTranscript);
    
    // Save analysis result to Supabase
    const savedRecord = await supabaseService.saveAnalysisResult(
      analysis, 
      null, // No audio file
      originalFilename
    );
    
    res.json({
      success: true,
      data: {
        ...analysis,
        supabase_id: savedRecord.id,
        source_type: 'text'
      }
    });

  } catch (error) {
    console.error('Text analysis error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Function to parse transcript text into structured format
function parseTranscriptText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const utterances = [];
  let fullTranscript = '';

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // Try to parse different formats
    let speaker = 'Speaker';
    let content = trimmedLine;
    let timestamp = index * 30; // Default timestamp

    // Format 1: [timestamp] Speaker: content
    const timestampMatch = trimmedLine.match(/^\[([^\]]+)\]\s*([^:]+):\s*(.+)$/);
    if (timestampMatch) {
      const timeStr = timestampMatch[1];
      speaker = timestampMatch[2].trim();
      content = timestampMatch[3].trim();
      
      // Parse timestamp (mm:ss or m:ss)
      const timeParts = timeStr.split(':');
      if (timeParts.length === 2) {
        timestamp = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
      }
    } 
    // Format 2: Speaker: content
    else if (trimmedLine.includes(':')) {
      const colonIndex = trimmedLine.indexOf(':');
      speaker = trimmedLine.substring(0, colonIndex).trim();
      content = trimmedLine.substring(colonIndex + 1).trim();
    }
    // Format 3: Detect speaker from content
    else {
      // Simple heuristic to detect speaker changes
      if (trimmedLine.toLowerCase().includes('agent') || 
          trimmedLine.toLowerCase().includes('agen')) {
        speaker = 'Agent';
      } else if (trimmedLine.toLowerCase().includes('customer') || 
                 trimmedLine.toLowerCase().includes('pelanggan')) {
        speaker = 'Customer';
      } else {
        // Alternate between speakers
        speaker = index % 2 === 0 ? 'Agent' : 'Customer';
      }
    }

    // Normalize speaker names
    if (speaker.toLowerCase().includes('agent') || speaker.toLowerCase().includes('agen')) {
      speaker = 'Agent';
    } else if (speaker.toLowerCase().includes('customer') || 
               speaker.toLowerCase().includes('pelanggan') || 
               speaker.toLowerCase().includes('client')) {
      speaker = 'Customer';
    }

    utterances.push({
      speaker: speaker,
      text: content,
      start_time: timestamp,
      end_time: timestamp + 30,
      confidence: 1.0
    });

    // Build full transcript
    const timeStr = `${Math.floor(timestamp / 60)}:${String(timestamp % 60).padStart(2, '0')}`;
    fullTranscript += `[${timeStr}] ${speaker}: ${content}\n\n`;
  });

  return {
    speakers: ['Agent', 'Customer'],
    utterances: utterances,
    full_transcript: fullTranscript.trim()
  };
}

// Get analysis history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const history = await supabaseService.getAnalysisHistory(limit, offset);
    
    res.json({
      success: true,
      data: history,
      pagination: {
        limit,
        offset,
        total: history.length
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific analysis by ID
router.get('/history/:id', async (req, res) => {
  try {
    const analysis = await supabaseService.getAnalysisById(req.params.id);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete analysis
router.delete('/history/:id', async (req, res) => {
  try {
    await supabaseService.deleteAnalysis(req.params.id);
    
    res.json({
      success: true,
      message: 'Analysis deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get storage statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await supabaseService.getStorageStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Add debug endpoint
router.get('/debug-env', (req, res) => {
  res.json({
    speechmaticsKeyPresent: !!process.env.SPEECHMATICS_API_KEY,
    openaiKeyPresent: !!process.env.OPENAI_API_KEY,
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('SPEECHMATICS') || key.includes('OPENAI')
    )
  });
});

export default router;