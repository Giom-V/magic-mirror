import {
    GoogleGenAI,
    LiveMusicSession,
    WeightedPrompt,
    LiveMusicServerMessage,
    LiveMusicPlaybackControl
} from "@google/genai";
import { base64ToArrayBuffer } from "./utils";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;

// Web Audio API setup
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
let nextPlayTime = 0;
let audioQueue: AudioBuffer[] = [];
let isPlaying = false;

function schedulePlayback() {
  if (audioContext.state === 'suspended') {
    return;
  }
  if (audioQueue.length === 0 || !isPlaying) {
    return;
  }

  while (audioQueue.length > 0) {
    const buffer = audioQueue.shift()!;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    if (audioContext.currentTime > nextPlayTime) {
      nextPlayTime = audioContext.currentTime;
    }

    source.start(nextPlayTime);
    nextPlayTime += buffer.duration;
  }
}

async function handleAudioChunk(chunk: ArrayBuffer) {
  // Lyria sends 16-bit PCM, 2 channels, 44100Hz
  const frameCount = chunk.byteLength / 2 / 2; // 2 bytes per sample, 2 channels
  const audioBuffer = audioContext.createBuffer(2, frameCount, 44100);

  const pcmData = new Int16Array(chunk);
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.getChannelData(1);

  for (let i = 0; i < frameCount; i++) {
    leftChannel[i] = pcmData[i * 2] / 32768.0;
    rightChannel[i] = pcmData[i * 2 + 1] / 32768.0;
  }

  audioQueue.push(audioBuffer);
  if (isPlaying) {
    schedulePlayback();
  }
}


class LyriaMusicClient {
  private client: GoogleGenAI;
  private session: LiveMusicSession | null = null;
  private static instance: LyriaMusicClient;

  private connectionPromise: Promise<void> | null = null;
  private isReady: boolean = false;

  constructor() {
    this.client = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: { apiVersion: "v1alpha" },
    });
  }

  public static getInstance(): LyriaMusicClient {
    if (!LyriaMusicClient.instance) {
      LyriaMusicClient.instance = new LyriaMusicClient();
    }
    return LyriaMusicClient.instance;
  }

  public connect(): Promise<void> {
    if (this.isReady && this.connectionPromise) {
      return this.connectionPromise;
    }

    if (!this.connectionPromise) {
      console.log("Connecting to Lyria...");
      this.connectionPromise = new Promise<void>((resolve, reject) => {
        this.client.live.music.connect({
          model: "models/lyria-realtime-exp",
          callbacks: {
            onmessage: (message: LiveMusicServerMessage) => {
              if (message.setupComplete) {
                console.log("Lyria setup complete.");
                this.isReady = true;
                resolve();
              }
              if (message.serverContent?.audioChunks) {
                for (const chunk of message.serverContent.audioChunks) {
                  if (chunk.data) {
                    const audioBuffer = base64ToArrayBuffer(chunk.data);
                    handleAudioChunk(audioBuffer);
                  }
                }
              }
              if(message.filteredPrompt) {
                console.warn(`Lyria prompt filtered: ${message.filteredPrompt.text} - Reason: ${message.filteredPrompt.filteredReason}`);
              }
            },
            onerror: (error: ErrorEvent) => {
              console.error("Lyria session error:", error)
              this.isReady = false;
              this.connectionPromise = null;
              reject(error);
            },
            onclose: () => {
              console.log("Lyria stream closed.");
              this.isReady = false;
              this.session = null;
              this.connectionPromise = null;
            },
          },
        }).then((session: LiveMusicSession) => {
          this.session = session;
          // The config appears to be set by the connection, not a separate call.
        }).catch((err: Error) => {
            console.error("Lyria connection failed:", err);
            this.isReady = false;
            this.connectionPromise = null;
            reject(err);
        });
      });
    }

    return this.connectionPromise;
  }

  public async disconnect(): Promise<void> {
    if (this.session) {
      this.session.close();
    }
    // Reset state is handled by onclose callback
  }

  public async setPrompts(prompts: WeightedPrompt[]): Promise<void> {
    if (!this.isReady || !this.session) {
      throw new Error("Lyria client is not ready. Call connect() and wait for it to complete.");
    }
    await this.session.setWeightedPrompts({ weightedPrompts: prompts });
    console.log("Lyria prompts updated:", prompts);
  }

  public async play(): Promise<void> {
    if (!this.isReady || !this.session) {
      throw new Error("Lyria client is not ready. Call connect() and wait for it to complete.");
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    await this.session.play();
    isPlaying = true;
    schedulePlayback();
    console.log("Lyria playback started.");
  }

  public async pause(): Promise<void> {
    if (!this.isReady || !this.session) {
      console.error("Lyria client is not ready.");
      return;
    }
    await this.session.pause();
    isPlaying = false;
    console.log("Lyria playback paused.");
  }

  public async stop(): Promise<void> {
    if (!this.isReady || !this.session) {
        console.error("Lyria client is not ready.");
        return;
    }
    await this.session.stop();
    isPlaying = false;
    audioQueue = [];
    nextPlayTime = 0;
    console.log("Lyria playback stopped.");
  }
}

export default LyriaMusicClient;
