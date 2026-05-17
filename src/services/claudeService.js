import axios from 'axios';
import { GEMINI_API_KEY } from '@env';

// 1. Configuration
const PRIMARY_MODEL = 'gemini-2.5-flash'; 
const FALLBACK_MODEL = 'gemini-1.5-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// API key loaded from .env — to swap keys, edit the .env file only
const API_KEY = GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are AidField, an emergency first aid assistant for Kenya.
Provide concise emergency first aid guidance. No markdown formatting whatsoever.

STRICT RULES:
- Never use asterisks, hashes, or any markdown symbols
- Keep each step to one short sentence
- Maximum 6 steps
- Always include calling 999 or 112
- Suggest household substitutes for medical supplies
- Be direct and calm

You must respond in this exact format:

URGENCY: [LIFE-THREATENING or URGENT or MODERATE]

IMMEDIATE ACTION: [One sentence on what to do right now]

STEPS:
[First step]
[Second step]
[Third step]
[Fourth step]
[Fifth step]
[Sixth step]

IMPROVISED RESOURCES:
- [Medical item]: [Household substitute]

CALL: [When to call 999 or 112]`;
// ── Strip residual markdown from AI responses ──────────────────────────────
const cleanMarkdown = (text) =>
  text
    .replace(/[*_~`#>]/g, '')       // remove markdown symbols
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove links, keep label
    .replace(/\n{3,}/g, '\n\n')    // collapse excess blank lines
    .trim();

/**
 * Helper to send request with automatic retry for 503 errors (Server Busy)
 */
const sendToGeminiWithRetry = async (model, payload, retries = 2) => {
  try {
    return await axios.post(
      `${BASE_URL}/${model}:generateContent?key=${API_KEY}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const status = error.response?.status;
    // 503 = Service Unavailable (Google's server is overloaded)
    if (status === 503 && retries > 0) {
      console.warn(`Server busy (503). Retrying ${model} in 2s...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendToGeminiWithRetry(model, payload, retries - 1);
    }
    throw error;
  }
};

// ── Text query with Auto-Fallback ──────────────────────────────────────────
export const getAIGuidance = async (userMessage) => {
  const payload = {
    contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: ${userMessage}` }] }],
    generationConfig: { 
      maxOutputTokens: 4096, 
      temperature: 0.2 
    }
  };

  try {
    const response = await sendToGeminiWithRetry(PRIMARY_MODEL, payload);
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    const status = error.response?.status;
    // Fallback for Quota (429), Forbidden (403), Model Missing (404), or Server Error (503/400)
    if ([400, 403, 404, 429, 503].includes(status)) {
      console.warn(`Primary model failed (Status ${status}). Trying fallback...`);
      const fbResponse = await sendToGeminiWithRetry(FALLBACK_MODEL, payload);
      return cleanMarkdown(fbResponse.data.candidates[0].content.parts[0].text);
    }
    throw error;
  }
};

// ── Image + text query with Auto-Fallback ──────────────────────────────────
export const getAIGuidanceWithImage = async (userMessage, base64Image) => {
  // Strip data URL prefix if present
  const cleanBase = base64Image.includes(',')
    ? base64Image.split(',')[1]
    : base64Image;

  // Validate base64 is not empty
  if (!cleanBase || cleanBase.length < 100) {
    throw new Error('Invalid image data');
  }

  const buildPayload = (msg) => ({
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: cleanBase,
            }
          },
          {
            text: SYSTEM_PROMPT + '\n\nUser: ' + (msg || 'What first aid is needed for what you see in this image?')
          }
        ]
      }
    ],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.3,
    }
  });

  try {
    const response = await sendToGeminiWithRetry(PRIMARY_MODEL, buildPayload(userMessage));
    return cleanMarkdown(response.data.candidates[0].content.parts[0].text);
  } catch (error) {
    const status = error.response?.status;
    // On quota (429), forbidden (403), not found (404), or server errors — try fallback model
    if ([400, 403, 404, 429, 503].includes(status)) {
      console.warn(`Image primary model failed (Status ${status}). Trying fallback...`);
      const fbResponse = await sendToGeminiWithRetry(FALLBACK_MODEL, buildPayload(userMessage));
      return cleanMarkdown(fbResponse.data.candidates[0].content.parts[0].text);
    }
    throw error;
  }
};

// ── Parse AI response into structured sections ──────────────────────────────
export const parseAIResponse = (text) => {
  const urgencyMatch   = text.match(/URGENCY:\s*(.+)/i);
  const immediateMatch = text.match(/IMMEDIATE ACTION:\s*(.+)/i);
  const stepsMatch     = text.match(/STEPS:([\s\S]*?)(?:IMPROVISED|CALL|$)/i);
  const resourcesMatch = text.match(/IMPROVISED RESOURCES:([\s\S]*?)(?:CALL|$)/i);
  const callMatch      = text.match(/CALL:\s*(.+)/i);

  const steps = (stepsMatch?.[1] || '')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => l.trim());

  const resources = (resourcesMatch?.[1] || '')
    .split('\n')
    .map((l) => l.replace(/^-\s*/, '').trim())
    .filter((l) => l.length > 0);

  return {
    urgency: urgencyMatch?.[1]?.trim() || 'MODERATE',
    immediate: immediateMatch?.[1]?.trim() || '',
    steps,
    resources,
    callNote: callMatch?.[1]?.trim() || 'Call 999 or 112 immediately.',
    raw: text
  };
};