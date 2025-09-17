import { Chat } from "@google/genai";
import { AppConfig } from "../types";
import { playMusic } from "./music-tool";

export function editImage(
  prompt: string,
  chat: Chat,
  config: AppConfig
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    console.log(`Using tool: editImage with prompt: ${prompt}`);
    if (config.music?.accompany) {
      const musicPrompt = config.editImageMusicPromptTemplate.replace(
        "${prompt}",
        prompt
      );
      playMusic(musicPrompt, config);
    }

    try {
      console.log("editImage: Sending image to model for editing...");
      const response = await chat.sendMessage({
        message: config.editImagePromptTemplate.replace("${prompt}", prompt),
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

      console.error(
        "editImage: Image editing failed, no image data in response."
      );
      reject("No image data in response");
    } catch (error) {
      console.error("editImage: Error in edit process:", error);
      reject(error);
    }
  });
}
