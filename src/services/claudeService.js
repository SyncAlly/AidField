import axios from 'axios';

// 1. Configuration: Using Gemini 3 series for 2026 performance
const PRIMARY_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// IMPORTANT: Replace this key soon and move it to a .env file!
const API_KEY = 'AIzaSyBau7md7BUgkmz0G7mJflEfbahbX3ISYKE';

const SYSTEM_PROMPT = `You are AidField, an emergency first aid assistant for Kenya.
Your role is to provide calm, clear, step-by-step first aid guidance to non-medical bystanders.

STRICT RULES:
1. Always start with the most critical action first
2. Number every step clearly
3. Keep each step to one sentence maximum
4. Always include a line about calling 999 or 112
5. Always suggest improvised alternatives to medical supplies
6. End with an urgency indicator: LIFE-THREATENING / URGENT / MODERATE
7. Never diagnose — only guide on immediate first aid actions
8. If the situation is unclear, ask ONE clarifying question first
9. Keep the entire response under 300 words
10. Be direct and calm — the user may be panicking

Format your response exactly like this:
URGENCY: [LIFE-THREATENING / URGENT / MODERATE]

IMMEDIATE ACTION: [One sentence on what to do right now]

STEPS:
1. [Step one]
2. [Step two]
3. [Step three]

IMPROVISED RESOURCES:
- [Standard item]: [Household substitute]

CALL: Call 999 or 112 immediately if [specific condition].`;

/**
 * Core function to send request to the Gemini API
 */
const sendToGemini = async (model, payload) => {
  return await axios.post(
    `${BASE_URL}/${model}:generateContent?key=${API_KEY}`,
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );
};

// ── Text query with Auto-Fallback ──────────────────────────────────────────
export const getAIGuidance = async (userMessage) => {
  const payload = {
    contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: ${userMessage}` }] }],
    generationConfig: { maxOutputTokens: 10024, temperature: 0.1 }
  };

  try {
    // Attempt 1: Primary Model
    const response = await sendToGemini(PRIMARY_MODEL, payload);
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    // 429 = Out of quota, 404 = Model retired/wrong name
    if (error.response?.status === 429 || error.response?.status === 404) {
      console.warn(`Primary model (${PRIMARY_MODEL}) unavailable. Falling back...`);
      try {
        // Attempt 2: Fallback Model
        const fallbackResponse = await sendToGemini(FALLBACK_MODEL, payload);
        return fallbackResponse.data.candidates[0].content.parts[0].text;
      } catch (fallbackError) {
        console.error("All AI models exhausted.");
        throw new Error("Local AI limits reached. Please call 999 or 112 immediately.");
      }
    }
    throw error;
  }
};

// ── Image + text query with Auto-Fallback ──────────────────────────────────
export const getAIGuidanceWithImage = async (userMessage, base64Image) => {
  const cleanBase = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const payload = {
    contents: [{
      parts: [
        { inline_data: { mime_type: 'image/jpeg', data: cleanBase } },
        { text: `${SYSTEM_PROMPT}\n\nUser: ${userMessage || 'What first aid is needed?'}` }
      ]
    }],
    generationConfig: { maxOutputTokens: 10024, temperature: 0.1 }
  };

  try {
    const response = await sendToGemini(PRIMARY_MODEL, payload);
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    if (error.response?.status === 429 || error.response?.status === 404) {
      console.warn("Switching to fallback model for image analysis...");
      const fbResponse = await sendToGemini(FALLBACK_MODEL, payload);
      return fbResponse.data.candidates[0].content.parts[0].text;
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
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter((l) => l.length > 0);

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