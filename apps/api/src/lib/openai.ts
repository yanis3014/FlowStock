import OpenAI from 'openai';
import { config } from '../config';
import { logger } from '../utils/logger';

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (!config.OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY non configurée — fonctionnalités IA désactivées');
    return null;
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return _client;
}

export const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export function getOpenAIKey(): string {
  const key = config.OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new Error('OPENAI_API_KEY manquante. Configurez-la dans .env pour utiliser l\'IA.');
  }
  return key;
}
