import {
  GoogleGenAI,
  LiveMusicSession,
  LiveMusicServerMessage,
} from '@google/genai';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;

const ai = new GoogleGenAI({
  apiKey: API_KEY,
  apiVersion: 'v1alpha',
});

// --- State Management ---
let session: LiveMusicSession | null = null;
let audioContext: AudioContext | null = null;
let nextStartTime = 0;
let isPlaying = false;

// --- Audio Playback Logic ---
function getAudioContext(): AudioContext {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

async function handleAudioChunk(chunkData: string) {
    const ctx = getAudioContext();
    // Base64 decode --> ArrayBuffer
    const binaryString = atob(chunkData);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const chunk = bytes.buffer;

    // Lyria sends 16-bit PCM, 2 channels, 44100Hz
    const frameCount = chunk.byteLength / 4; // 2 bytes per sample, 2 channels
    const audioBuffer = ctx.createBuffer(2, frameCount, 44100);

    const pcmData = new Int16Array(chunk);
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);

    for (let i = 0; i < frameCount; i++) {
        leftChannel[i] = pcmData[i * 2] / 32768.0;
        rightChannel[i] = pcmData[i * 2 + 1] / 32768.0;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (currentTime > nextStartTime) {
        nextStartTime = currentTime;
    }

    source.start(nextStartTime);
    nextStartTime += audioBuffer.duration;
}

// --- Tool Implementation ---
export async function playPiano() {
  if (isPlaying) {
    console.log("Piano is already playing.");
    return;
  }

  if (session) {
    // If we have a session, just ensure it's playing
    getAudioContext().resume();
    session.play();
    isPlaying = true;
    return;
  }

  console.log("Starting piano tool...");
  isPlaying = true;
  nextStartTime = 0;

  try {
    session = await ai.live.music.connect({
      model: "models/lyria-realtime-exp",
      callbacks: {
        onmessage: (message: LiveMusicServerMessage) => {
          if (message.setupComplete) {
            console.log("Lyria connection ready.");
            // Once setup is complete, set prompt and play
            session?.setWeightedPrompts({
                weightedPrompts: [{ text: 'Piano', weight: 1.0 }]
            });
            session?.play();
          }
          if (message.serverContent?.audioChunks) {
            for (const chunk of message.serverContent.audioChunks) {
              if (chunk.data) {
                handleAudioChunk(chunk.data);
              }
            }
          }
        },
        onerror: (error: ErrorEvent) => {
          console.error("Lyria session error:", error);
          isPlaying = false;
          session = null;
        },
        onclose: () => {
          console.log("Lyria session closed.");
          isPlaying = false;
          session = null;
        },
      },
    });

    // Resume audio context on user interaction
    getAudioContext().resume();

  } catch (e) {
    console.error("Failed to start piano tool:", e);
    isPlaying = false;
    session = null;
  }
}
