import { GoogleGenAI, Part } from "@google/genai";
import { AppConfig } from "../types";
import { playMusic } from "./music-tool";

function fileToGenerativePart(data: string, mimeType: string): Part {
  return {
    inlineData: {
      data,
      mimeType,
    },
  };
}

export async function editImage(
  prompt: string,
  image: string,
  setEditedImage: (image: string | null) => void,
  config: AppConfig
) {
  console.log("Using tool: editImage");
  if (config.music?.accompany) {
    playMusic(`Alter the music to take into account that we're adding ${prompt}`);
  }
  const base64Data = image.split(",")[1];

  const ai = new GoogleGenAI({
    apiKey: process.env.REACT_APP_GEMINI_API_KEY as string,
  });
  const imagePart = fileToGenerativePart(base64Data, "image/jpeg");

  const response = await ai.models.generateContent({
    model: config.imageEditModel,
    contents: [imagePart, prompt],
  });

  if (
    response.candidates &&
    response.candidates.length > 0 &&
    response.candidates[0].content &&
    response.candidates[0].content.parts
  ) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        const base64ImageBytes: string = part.inlineData.data;
        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
        setEditedImage(imageUrl);
        break;
      }
    }
  }
}
