import { GoogleGenAI } from "@google/genai";
import { AppConfig } from "../types";

export function generateStoryImage(
  prompt: string,
  ai: GoogleGenAI,
  config: AppConfig
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    console.log(`Using tool: generateStoryImage with prompt: ${prompt}`);

    try {
      console.log("generateStoryImage: Sending prompt to model for image generation...");
      const response = await ai.models.generateContent({
        model: config.imageEditModel,
        contents: [
          {
            parts: [
              {
                text: `Generate a fantasy-style image based on the following description: ${prompt}`,
              },
            ],
          },
        ],
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
            console.log("generateStoryImage: Image generated successfully.");
            resolve(imageUrl);
            return;
          }
        }
      }

      console.error(
        "generateStoryImage: Image generation failed, no image data in response."
      );
      reject("No image data in response");
    } catch (error) {
      console.error("generateStoryImage: Error in image generation process:", error);
      reject(error);
    }
  });
}