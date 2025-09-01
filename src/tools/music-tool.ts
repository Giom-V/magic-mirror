import {
  GoogleGenAI,
  LiveMusicSession,
  LiveMusicServerMessage,
  Type,
  WeightedPrompt,
} from '@google/genai';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;

const genAI = new GoogleGenAI({
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

async function connectToLyria(): Promise<LiveMusicSession> {
    if (session) {
        return session;
    }

    console.log("Connecting to Lyria...");

    const newSession = await genAI.live.music.connect({
        model: "models/lyria-realtime-exp",
        callbacks: {
            onmessage: (message: LiveMusicServerMessage) => {
                if (message.setupComplete) {
                    console.log("Lyria connection ready.");
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

    session = newSession;
    return session;
}


const musicPromptsSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "A musical prompt for Lyria, such as an instrument, genre, or mood. Should be in English.",
        },
        weight: {
          type: Type.NUMBER,
          description: "The weight for the prompt, from 0.1 to 2.0. Default is 1.0.",
        },
      },
      required: ["text"],
    },
};

// --- Tool Implementation ---
export async function playMusic(prompt: string, modelName: string = "gemini-2.5-flash-lite") {
  console.log(`Music tool called with prompt: "${prompt}" using model ${modelName}`);

  try {
    const musicSession = await connectToLyria();

    console.log("Generating musical prompts with Gemini...");
    const response = await genAI.models.generateContent({
        model: modelName,
        contents: [
          {
            parts: [
              {
                text: `Based on the following user request, generate a list of 2 to 5 diverse and creative musical prompts for a music generation model. The model has a vast knowledge of instruments, genres, and moods.

User request: "${prompt}"`
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: musicPromptsSchema,
        },
    });

    const responseText = response.text;
    if (!responseText) {
        console.error("Failed to generate musical prompts. Response was empty.");
        return;
    }

    const weightedPrompts: WeightedPrompt[] = JSON.parse(responseText);
    if (!weightedPrompts || weightedPrompts.length === 0) {
      console.error("Failed to generate musical prompts.");
      return;
    }

    console.log("Generated prompts:", weightedPrompts);

    await musicSession.setWeightedPrompts({ weightedPrompts });

    if (!isPlaying) {
        getAudioContext().resume();
        musicSession.play();
        isPlaying = true;
    }

  } catch (e) {
    console.error("Error in playMusic tool:", e);
    isPlaying = false;
  }
}
