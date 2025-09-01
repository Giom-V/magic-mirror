import { GoogleGenAI, MusicSession, WeightedPrompt } from "@google/genai";
import { base64ToArrayBuffer } from "./utils";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;

// Web Audio API setup
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
let nextPlayTime = 0;
let audioQueue: AudioBuffer[] = [];
let isPlaying = false;

function schedulePlayback() {
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
  private session: MusicSession | null = null;
  private static instance: LyriaMusicClient;

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

  public async connect(): Promise<void> {
    if (this.session) {
      console.log("Lyria session already exists.");
      return;
    }

    console.log("Connecting to Lyria...");
    this.session = await this.client.live.music.connect({
      model: "models/lyria-realtime-exp",
      callbacks: {
        onmessage: (message) => {
          if (message.serverContent?.audioChunks) {
            for (const chunk of message.serverContent.audioChunks) {
              const audioBuffer = base64ToArrayBuffer(chunk.data);
              handleAudioChunk(audioBuffer);
            }
          }
        },
        onerror: (error) => console.error("Lyria session error:", error),
        onclose: () => console.log("Lyria stream closed."),
      },
    });

    await this.session.setMusicGenerationConfig({
        musicGenerationConfig: {
            audioFormat: "pcm16",
            sampleRateHz: 44100,
        },
    });

    console.log("Lyria connected.");
  }

  public async disconnect(): Promise<void> {
    if (this.session) {
      this.session.close();
      this.session = null;
      isPlaying = false;
      audioQueue = [];
      console.log("Lyria disconnected.");
    }
  }

  public async setPrompts(prompts: WeightedPrompt[]): Promise<void> {
    if (!this.session) {
      console.error("Not connected to Lyria.");
      return;
    }
    await this.session.setWeightedPrompts({ weightedPrompts: prompts });
    console.log("Lyria prompts updated:", prompts);
  }

  public async play(): Promise<void> {
    if (!this.session) {
      console.error("Not connected to Lyria.");
      return;
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
    if (!this.session) {
      console.error("Not connected to Lyria.");
      return;
    }
    await this.session.pause();
    isPlaying = false;
    console.log("Lyria playback paused.");
  }

  public async stop(): Promise<void> {
    if (!this.session) {
        console.error("Not connected to Lyria.");
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
