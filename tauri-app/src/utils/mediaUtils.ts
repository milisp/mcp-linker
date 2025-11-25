import { v4 } from 'uuid';
import { MediaAttachment } from '@/types/chat';

// Supported image formats
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];

// Supported audio formats  
export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

/**
 * Check if file is an image
 */
export const isImageFile = (filename: string): boolean => {
  const ext = getFileExtension(filename);
  return IMAGE_EXTENSIONS.includes(ext);
};

/**
 * Check if file is an audio file
 */
export const isAudioFile = (filename: string): boolean => {
  const ext = getFileExtension(filename);
  return AUDIO_EXTENSIONS.includes(ext);
};

/**
 * Check if file is a supported media file
 */
export const isMediaFile = (filename: string): boolean => {
  return isImageFile(filename) || isAudioFile(filename);
};

/**
 * Get file extension
 */
export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
};

/**
 * Infer MIME type from file extension
 */
export const getMimeType = (filename: string): string => {
  const ext = getFileExtension(filename);
  
  // Image MIME types
  const imageMimes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  
  // Audio MIME types
  const audioMimes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
  };
  
  return imageMimes[ext] || audioMimes[ext] || 'application/octet-stream';
};

/**
 * Convert file path to MediaAttachment object
 */
export const createMediaAttachment = async (filePath: string): Promise<MediaAttachment> => {
  const filename = filePath.split(/[\\/]/).pop() || filePath;
  const type = isImageFile(filename) ? 'image' : 'audio';
  const mimeType = getMimeType(filename);
  
  return {
    id: v4(),
    type,
    path: filePath,
    name: filename,
    mimeType,
  };
};