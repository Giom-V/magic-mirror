import { GoogleGenAI, Session, FunctionDeclaration, Type, Schema, GenerateContentResponse } from "@google/genai";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext, base64ToArrayBuffer } from "../lib/utils";
import config from "../config.json";

let session: any | null = null;
let audioStreamer: AudioStreamer | null = null;

interface WeightedPrompt {
  text: string;
  weight: number;
}

const MusicPrompts: Schema = {
  type: Type.OBJECT,
  properties: {
    prompts: {
      type: Type.ARRAY,
      description: "List of musical prompts.",
      items: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: "The musical prompt, e.g., 'Funky bassline' or '80s synth melody'."
          },
          weight: {
            type: Type.NUMBER,
            description: "The weight of the prompt, from 0.0 to 2.0."
          }
        },
        required: ["text", "weight"]
      }
    }
  },
  required: ["prompts"]
};

const ai = new GoogleGenAI({
  apiKey: process.env.REACT_APP_GEMINI_API_KEY as string,
});

async function getAudioStreamer() {
  if (!audioStreamer) {
    const audioCtx = await audioContext({ id: "music-audio-out" });
    audioStreamer = new AudioStreamer(audioCtx);
  }
  return audioStreamer;
}

const client = new GoogleGenAI({
  apiKey: process.env.REACT_APP_GEMINI_API_KEY as string,
  apiVersion: "v1alpha",
});

async function generatePrompts(prompt: string): Promise<WeightedPrompt[]> {
  const result: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-256k",
    contents: [
      {
        role: "user",
        parts: [{
          text: `Given the following user request, generate a list of musical prompts for a music generation model. The prompts should be a mix of genres, instruments, and moods that fit the request. Return a JSON object with a "prompts" array, where each object has "text" and "weight".\n\nUser request: "${prompt}"`
        }]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: MusicPrompts,
    },
  });

  if (result.candidates && result.candidates[0].content.parts) {
    const part = result.candidates[0].content.parts[0];
    if (part.text) {
      try {
        const jsonResponse = JSON.parse(part.text);
        if (jsonResponse.prompts) {
          return jsonResponse.prompts;
        }
      } catch (e) {
        console.error("Error parsing JSON response from Gemini:", e);
      }
    }
  }
  return [];
}


export async function playOrUpdateMusic(prompt: string) {
  const prompts = await generatePrompts(prompt);
  if (!prompts || prompts.length === 0) {
    console.error("Could not generate prompts from the given input.");
    return;
  }

  if (session && session.isOpen()) {
    console.log("Updating music prompts...", prompts);
    await session.setWeightedPrompts({ weightedPrompts: prompts });
    return;
  }

  console.log("Starting music with prompts...", prompts);
  if (session) {
    await session.close();
    session = null;
  }

  const streamer = await getAudioStreamer();

  session = await (client.live as any).music.connect({
    model: "models/lyria-realtime-exp",
    callbacks: {
      onmessage: (message: any) => {
        if (message.serverContent?.audioChunks) {
          for (const chunk of message.serverContent.audioChunks) {
            const audioData = new Uint8Array(base64ToArrayBuffer(chunk.data));
            streamer.addPCM16(audioData);
          }
        }
      },
      onerror: (error: any) => console.error("music session error:", error),
      onclose: () => {
        console.log("Lyria RealTime stream closed.");
        session = null;
      },
    },
  });

  await session.setWeightedPrompts({
    weightedPrompts: prompts,
  });

  await session.setMusicGenerationConfig({
    musicGenerationConfig: {
      bpm: 120,
      audioFormat: "pcm16",
      sampleRateHz: 24000,
    },
  });

  await session.play();
}

export async function stopMusic() {
  if (session && session.isOpen()) {
    console.log("Stopping music...");
    await session.stop();
  }
}

// This is the function that will be exposed to the console.
(window as any).play_music = playOrUpdateMusic;
(window as any).stop_music = stopMusic;
