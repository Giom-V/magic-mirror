import { Chat, GoogleGenAI } from "@google/genai";
import { AppConfig } from "../types";
import { playMusic } from "./music-tool";

export async function generateStoryImage(
  prompt: string,
  ai: GoogleGenAI,
  config: AppConfig,
  chat: Chat | null,
  onChatCreated: (chat: Chat) => void
): Promise<string> {
  console.log(`Using tool: generateStoryImage with prompt: ${prompt}`);
  if (config.music?.accompany) {
    console.log("...and accompanying music.");
    playMusic(prompt, config);
  }

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

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data
  );

  if (imagePart?.inlineData?.data) {
    const base64ImageBytes: string = imagePart.inlineData.data;
    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
    console.log("generateStoryImage: Image generated successfully.");
    return imageUrl;
  }

  throw new Error("Image generation failed, no image data in response.");
}