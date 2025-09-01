import { GoogleGenAI, Type } from "@google/genai";
import LyriaMusicClient from "../lib/lyria-music-client";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;

const ai = new GoogleGenAI({
  apiKey: API_KEY,
  httpOptions: { apiVersion: "v1alpha" },
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

export async function playMusic(prompt: string) {
  console.log(`Music tool called with prompt: "${prompt}"`);

  try {
    console.log("Generating musical prompts with Gemini...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    const weightedPrompts = JSON.parse(response.text);
    if (!weightedPrompts || weightedPrompts.length === 0) {
      console.error("Failed to generate musical prompts.");
      return;
    }

    console.log("Generated prompts:", weightedPrompts);

    const lyriaClient = LyriaMusicClient.getInstance();
    await lyriaClient.connect();
    await lyriaClient.setPrompts(weightedPrompts);
    await lyriaClient.play();

  } catch (e) {
    console.error("Error in playMusic tool:", e);
  }
}
