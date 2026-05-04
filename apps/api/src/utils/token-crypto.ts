import crypto from 'crypto';
import { config } from '../config';

const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const hex = config.TOKEN_ENCRYPTION_KEY?.trim();
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, 'hex');
  }
  if (config.NODE_ENV === 'production') {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes) in production');
  }
  return crypto.scryptSync(config.JWT_SECRET, 'bmad-square-token', 32);
}

/** Encrypt UTF-8 string → base64(iv|ciphertext|tag). */
export function encryptUtf8(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString('base64url');
}

/** Decrypt base64(iv|ciphertext|tag) → UTF-8 string. */
export function decryptUtf8(payload: string): string {
  const key = getKey();
  const raw = Buffer.from(payload, 'base64url');
  if (raw.length < IV_LEN + TAG_LEN) {
    throw new Error('Invalid ciphertext');
  }
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(raw.length - TAG_LEN);
  const data = raw.subarray(IV_LEN, raw.length - TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
