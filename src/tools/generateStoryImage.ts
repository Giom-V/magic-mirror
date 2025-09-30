import { Chat, GoogleGenAI } from "@google/genai";
import { AppConfig } from "../types";
import { playMusic } from "./music-tool";

export function generateStoryImage(
  prompt: string,
  music_prompt: string | undefined,
  ai: GoogleGenAI,
  config: AppConfig,
  chat: Chat | null,
  onChatCreated: (chat: Chat) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    console.log(`Using tool: generateStoryImage with prompt: ${prompt}`);
    if (music_prompt) {
      console.log(`...and music_prompt: ${music_prompt}`);
      playMusic(music_prompt, config);
    }

    try {
      let currentChat = chat;
      if (!currentChat) {
        console.log("generateStoryImage: Creating new chat session for story.");
        currentChat = ai.chats.create({
          model: config.imageEditModel,
        });
        onChatCreated(currentChat);
      }

      console.log("generateStoryImage: Sending prompt to model for image generation...");
      const response = await currentChat.sendMessage({
        message: [
            `Generate a fantasy-style image based on the following description: ${prompt}. Maintain a consistent art style with any previous images in this conversation.`,
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