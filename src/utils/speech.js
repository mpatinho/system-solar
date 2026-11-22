// Lectura en voz alta (Web Speech API, español de España si está disponible).
import { toSpeech } from './speechText.js';
let voice = null;

function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'es-ES') || voices.find((v) => v.lang?.startsWith('es')) || null;
}

if ('speechSynthesis' in window) {
  voice = pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', () => { voice = pickVoice(); });
}

export const speechAvailable = () => 'speechSynthesis' in window;

export function speak(text, onEnd) {
  if (!speechAvailable()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(toSpeech(text));
  u.lang = 'es-ES';
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.pitch = 1.05;
  if (onEnd) u.onend = onEnd;
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (speechAvailable()) speechSynthesis.cancel();
}

export const isSpeaking = () => speechAvailable() && speechSynthesis.speaking;
