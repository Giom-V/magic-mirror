/**
 * Real-time background music generation tool powered by Lyria RealTime and
 * structured prompt expansion via the Gemini Interactions API (`gemini-3.5-flash-lite`).
 */

import {
  GoogleGenAI,
  LiveMusicSession,
  LiveMusicServerMessage,
  WeightedPrompt,
} from "@google/genai";
import { AppConfig } from "../types";

const API_KEY = (process.env.REACT_APP_GEMINI_API_KEY as string) || "";

// --- Web Audio API implementation ---
let audioContext: AudioContext | null = null;
let nextStartTime = 0;

/**
 * Returns or initializes the shared browser Web Audio API context.
 */
function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
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
      apiVersion: "v1alpha",
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
    if (ctx.state === "suspended") {
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

    console.info("[LLM Call] Connecting to Lyria RealTime (models/lyria-realtime-exp)...");
    const newSession = await this.client.live.music.connect({
      model: "models/lyria-realtime-exp",
      callbacks: {
        onmessage: (message: LiveMusicServerMessage) => {
          if (message.setupComplete) {
            console.info("Lyria RealTime connection ready.");
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
          console.info("Lyria session closed.");
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
let interactionsClient: GoogleGenAI | null = null;

/**
 * Returns a lazily initialized GoogleGenAI client for Interactions API calls.
 */
function getInteractionsClient(): GoogleGenAI {
  if (!interactionsClient) {
    interactionsClient = new GoogleGenAI({
      apiKey: API_KEY,
    });
  }
  return interactionsClient;
}

const musicPromptsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description:
          "A musical prompt for Lyria, such as an instrument, genre, or mood. Should be in English.",
      },
      weight: {
        type: "number",
        description:
          "The weight for the prompt, from 0.1 to 2.0. Default is 1.0.",
      },
    },
    required: ["text"],
  },
};

/**
 * Expands a user's music description into weighted Lyria prompts using
 * `gemini-3.5-flash-lite` via the Interactions API and starts streaming music.
 *
 * @param prompt - Natural-language music description.
 * @param config - Active application configuration.
 * @param modelName - Gemini model ID for prompt expansion (defaults to `gemini-3.5-flash-lite`).
 */
export async function playMusic(
  prompt: string,
  config: AppConfig,
  modelName: string = "gemini-3.5-flash-lite"
) {
  console.info(
    `[Tool] playMusic called with prompt="${prompt}" using model=${modelName}`
  );

  try {
    const promptText = config.musicPromptTemplate.replace(
      /\$\{prompt\}/g,
      prompt
    );
    const ai = getInteractionsClient();

    console.info(
      `[LLM Call] playMusic -> ai.interactions.create(model=${modelName})`,
      {
        model: modelName,
        prompt: promptText,
        response_format: {
          type: "text",
          mime_type: "application/json",
        },
      }
    );

    const interaction = await ai.interactions.create({
      model: modelName,
      input: promptText,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: musicPromptsSchema,
      },
    });

    const responseText = interaction.output_text;
    console.info(
      `[LLM Response] playMusic <- interaction.id=${interaction.id}`,
      { output_text: responseText }
    );

    if (!responseText) {
      console.error("Failed to generate musical prompts. Response was empty.");
      return;
    }

    const weightedPrompts: WeightedPrompt[] = JSON.parse(responseText);
    if (!weightedPrompts || weightedPrompts.length === 0) {
      console.error("Failed to generate musical prompts.");
      return;
    }

    console.info("Generated Lyria weighted prompts:", weightedPrompts);
    const lyriaClient = LyriaMusicClient.getInstance();
    await lyriaClient.play(weightedPrompts);
  } catch (e) {
    console.error("Error in playMusic tool:", e);
  }
}

/**
 * Stops the currently playing Lyria RealTime music stream.
 */
export async function stopMusic() {
  console.info("Stopping music...");
  const lyriaClient = LyriaMusicClient.getInstance();
  await lyriaClient.stop();
}

/**
 * Updates the Web Audio gain level for the Lyria music stream.
 *
 * @param level - Gain level between 0.0 and 1.0.
 */
export function setMusicVolume(level: number) {
  const lyriaClient = LyriaMusicClient.getInstance();
  lyriaClient.setVolume(level);
}

/**
 * Toggles background music playback on or off.
 *
 * @param config - Active application configuration.
 * @param prompt - Fallback prompt when starting music manually.
 */
export function toggleMusic(config: AppConfig, prompt: string = "Piano") {
  const lyriaClient = LyriaMusicClient.getInstance();
  if (lyriaClient.getIsPlaying()) {
    stopMusic();
  } else {
    playMusic(prompt, config);
  }
}
