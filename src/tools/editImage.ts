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

export function editImage(
  prompt: string,
  image: string,
  config: AppConfig
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    console.log(`Using tool: editImage with prompt: ${prompt}`);
    if (!image) {
      return reject("No image provided to edit");
    }
    if (config.music?.accompany) {
      playMusic(
        `Alter the music to take into account that we're adding ${prompt}`
      );
    }
    const base64Data = image.split(",")[1];

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.REACT_APP_GEMINI_API_KEY as string,
      });
      const imagePart = fileToGenerativePart(base64Data, "image/jpeg");

      console.log("editImage: Sending image to model for editing...");
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
            console.log("editImage: Image edited successfully.");
            resolve(imageUrl);
            return;
          }
        }
      }

      console.error("editImage: Image editing failed, no image data in response.");
      reject("No image data in response");
    } catch (error) {
      console.error("editImage: Error in edit process:", error);
      reject(error);
    }
  });
}
