import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config(); // ✅ Pastikan dipanggil di sini supaya process.env bisa terbaca

class SupabaseService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('❌ Missing Supabase configuration (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env)');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase service initialized');
  }

  async uploadAudioFile(filePath, originalFilename) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);
      const fileExt = originalFilename.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      
      const { data, error } = await this.supabase.storage
        .from('audio-files')
        .upload(fileName, fileBuffer, {
          contentType: this.getContentType(fileExt),
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData, error: urlError } = this.supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      if (urlError) throw urlError;

      return {
        fileName,
        publicUrl: urlData.publicUrl,
        path: data.path,
        size: fileBuffer.length
      };
    } catch (error) {
      console.error('❌ Error uploading to Supabase:', error.message);
      throw error;
    }
  }

  async saveAnalysisResult(analysisData, audioFileInfo = null, originalFilename = '') {
    try {
      const record = {
        call_id: analysisData.call_id,
        original_filename: originalFilename,
        audio_file_url: audioFileInfo?.publicUrl || null,
        transcript_text: analysisData.full_transcript || '',
        analysis_json: analysisData,
        overall_scores: analysisData.scores || null,
        agent_scores: analysisData.agent_scores || null,
        customer_scores: analysisData.customer_scores || null,
        file_size: audioFileInfo?.size || null,
        duration_estimate: this.estimateDuration(analysisData.utterances || []),
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('analysis_results')
        .insert([record])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Analysis result saved to Supabase');
      return data;
    } catch (error) {
      console.error('❌ Error saving analysis result:', error.message);
      throw error;
    }
  }

  async getAnalysisHistory(limit = 50, offset = 0) {
    try {
      const { data, error } = await this.supabase
        .from('analysis_results')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching analysis history:', error.message);
      throw error;
    }
  }

  async getAnalysisById(id) {
    try {
      const { data, error } = await this.supabase
        .from('analysis_results')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching analysis by ID:', error.message);
      throw error;
    }
  }

  async deleteAnalysis(id) {
    try {
      const { data: record, error: fetchError } = await this.supabase
        .from('analysis_results')
        .select('audio_file_url')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (record?.audio_file_url) {
        const fileName = record.audio_file_url.split('/').pop();
        await this.supabase.storage
          .from('audio-files')
          .remove([fileName]);
      }

      const { error } = await this.supabase
        .from('analysis_results')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Analysis deleted from Supabase');
      return true;
    } catch (error) {
      console.error('❌ Error deleting analysis:', error.message);
      throw error;
    }
  }

  getContentType(fileExtension) {
    const types = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      mp4: 'audio/mp4'
    };
    return types[fileExtension.toLowerCase()] || 'application/octet-stream';
  }

  estimateDuration(utterances) {
    if (!utterances.length) return 0;
    const lastUtterance = utterances[utterances.length - 1];
    return Math.ceil(lastUtterance.end_time || utterances.length * 30);
  }

  async getStorageStats() {
    try {
      const { data: files, error } = await this.supabase.storage
        .from('audio-files')
        .list();

      if (error) throw error;

      const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
      
      return {
        totalFiles: files.length,
        totalSize,
        totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100
      };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error.message);
      return { totalFiles: 0, totalSize: 0, totalSizeMB: 0 };
    }
  }
}

export default new SupabaseService();
