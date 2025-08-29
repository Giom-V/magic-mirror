import { GoogleGenAI, Session, WeightedPrompt, FunctionDeclaration } from "@google/genai";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext, base64ToArrayBuffer } from "../lib/utils";
import config from "../config.json";

let session: Session | null = null;
let audioStreamer: AudioStreamer | null = null;

// The `pydantic` model from the Python example is not directly available in JS/TS.
// I will define the schema for the structured output directly.
const MusicPrompts = {
  type: "OBJECT",
  properties: {
    prompts: {
      type: "ARRAY",
      description: "List of musical prompts.",
      items: {
        type: "OBJECT",
        properties: {
          text: {
            type: "STRING",
            description: "The musical prompt, e.g., 'Funky bassline' or '80s synth melody'."
          },
          weight: {
            type: "NUMBER",
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
  const result = await ai.models.generateContent({
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

  if (result.response.candidates && result.response.candidates[0].content.parts) {
    const part = result.response.candidates[0].content.parts[0];
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

  session = await client.live.music.connect({
    model: "models/lyria-realtime-exp",
    callbacks: {
      onmessage: (message) => {
        if (message.serverContent?.audioChunks) {
          for (const chunk of message.serverContent.audioChunks) {
            const audioData = new Uint8Array(base64ToArrayBuffer(chunk.data));
            streamer.addPCM16(audioData);
          }
        }
      },
      onerror: (error) => console.error("music session error:", error),
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
