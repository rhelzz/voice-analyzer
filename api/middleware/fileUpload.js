import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Audio files
  const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a'];
  // Text files
  const allowedTextTypes = ['text/plain'];
  
  const allAllowedTypes = [...allowedAudioTypes, ...allowedTextTypes];
  
  if (allAllowedTypes.includes(file.mimetype) || 
      file.originalname.toLowerCase().endsWith('.txt')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files and text files allowed.'), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB (for audio files, text files will be much smaller)
  },
  fileFilter
});