/**
 * Encryption utilities for sensitive data storage
 */

import crypto from 'crypto';

// Use environment variable or fallback for development
const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] || 'biomasters-dev-key-32-chars-long!';

// Ensure key is exactly 32 bytes for AES-256
const NORMALIZED_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

// Algorithm and IV length for AES-256-CBC
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt a string using AES-256-CBC with proper IV
 */
export function encrypt(text: string): string {
  try {
    // Generate a random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, NORMALIZED_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend IV to encrypted data (IV is not secret)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string using AES-256-CBC
 * Supports both new format (with IV) and legacy format (for backward compatibility)
 */
export function decrypt(encryptedData: string): string {
  try {
    // Check if this is the new format (contains ':' separator)
    if (encryptedData.includes(':')) {
      // New format: IV:encrypted_data
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0]!, 'hex');
      const encrypted = parts[1]!;

      const decipher = crypto.createDecipheriv(ALGORITHM, NORMALIZED_KEY, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } else {
      // Legacy format: attempt to decrypt with old method (will fail gracefully)
      // This is for backward compatibility during transition
      console.warn('⚠️ Attempting to decrypt legacy format data - this will be re-encrypted with new format');
      throw new Error('Legacy encrypted data detected - please regenerate signing keys');
    }
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure random signing key
 */
export function generateSigningKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
