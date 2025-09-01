import {
  GoogleGenAI,
  LiveMusicSession,
  LiveMusicServerMessage,
  Type,
  WeightedPrompt,
} from '@google/genai';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;

// --- Web Audio API implementation ---
let audioContext: AudioContext | null = null;
let nextStartTime = 0;

function getAudioContext(): AudioContext {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

// --- Lyria Client Singleton ---
class LyriaMusicClient {
    private static instance: LyriaMusicClient;
    private client: GoogleGenAI;
    private session: LiveMusicSession | null = null;
    private isPlaying: boolean = false;
    private gainNode: GainNode;

    private constructor() {
        this.client = new GoogleGenAI({
            apiKey: API_KEY,
            apiVersion: 'v1alpha',
        });
        const ctx = getAudioContext();
        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = 0.5; // Default volume at 50%
        this.gainNode.connect(ctx.destination);
    }

    public static getInstance(): LyriaMusicClient {
        if (!LyriaMusicClient.instance) {
            LyriaMusicClient.instance = new LyriaMusicClient();
        }
        return LyriaMusicClient.instance;
    }

    private async handleAudioChunk(chunkData: string) {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        const binaryString = atob(chunkData);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const chunk = bytes.buffer;
        const frameCount = chunk.byteLength / 4;
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
        source.connect(this.gainNode); // Connect to gain node instead of destination
        const currentTime = ctx.currentTime;
        if (currentTime > nextStartTime) {
            nextStartTime = currentTime;
        }
        source.start(nextStartTime);
        nextStartTime += audioBuffer.duration;
    }

    private async connect(): Promise<LiveMusicSession> {
        if (this.session) {
            return this.session;
        }

        console.log("Connecting to Lyria...");
        const newSession = await this.client.live.music.connect({
            model: "models/lyria-realtime-exp",
            callbacks: {
                onmessage: (message: LiveMusicServerMessage) => {
                    if (message.setupComplete) {
                        console.log("Lyria connection ready.");
                    }
                    if (message.serverContent?.audioChunks) {
                        for (const chunk of message.serverContent.audioChunks) {
                            if (chunk.data) {
                                this.handleAudioChunk(chunk.data);
                            }
                        }
                    }
                },
                onerror: (error: ErrorEvent) => {
                    console.error("Lyria session error:", error);
                    this.session = null;
                    this.isPlaying = false;
                },
                onclose: () => {
                    console.log("Lyria session closed.");
                    this.session = null;
                    this.isPlaying = false;
                },
            },
        });
        this.session = newSession;
        return newSession;
    }

    public async play(prompts: WeightedPrompt[]): Promise<void> {
        const musicSession = await this.connect();
        await musicSession.setWeightedPrompts({ weightedPrompts: prompts });

        if (!this.isPlaying) {
            getAudioContext().resume();
            musicSession.play();
            this.isPlaying = true;
        }
    }

    public async stop(): Promise<void> {
        if (this.session) {
            this.session.stop();
        }
        this.isPlaying = false;
        nextStartTime = 0;
    }

    public async disconnect(): Promise<void> {
        if (this.session) {
            this.session.close();
        }
    }

    public setVolume(level: number) {
        if (level < 0 || level > 1) {
            console.error("Volume level must be between 0 and 1.");
            return;
        }
        this.gainNode.gain.value = level;
    }

    public getIsPlaying(): boolean {
        return this.isPlaying;
    }
}


// --- Tool Implementation ---
const genAI = new GoogleGenAI({
    apiKey: API_KEY,
    apiVersion: 'v1alpha',
});

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

export async function playMusic(prompt: string, modelName: string = "gemini-2.5-flash-lite") {
  console.log(`Music tool called with prompt: "${prompt}" using model ${modelName}`);

  try {
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
    const lyriaClient = LyriaMusicClient.getInstance();
    await lyriaClient.play(weightedPrompts);

  } catch (e) {
    console.error("Error in playMusic tool:", e);
  }
}

export async function stopMusic() {
    console.log("Stopping music...");
    const lyriaClient = LyriaMusicClient.getInstance();
    await lyriaClient.stop();
}

export function setMusicVolume(level: number) {
    const lyriaClient = LyriaMusicClient.getInstance();
    lyriaClient.setVolume(level);
}

export function toggleMusic(prompt: string = "Piano") {
    const lyriaClient = LyriaMusicClient.getInstance();
    if (lyriaClient.getIsPlaying()) {
        stopMusic();
    } else {
        playMusic(prompt);
    }
}
