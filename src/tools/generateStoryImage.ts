/**
 * Interactive story scene illustration tool using the Gemini Interactions API.
 *
 * Generates fantasy illustrations across sequential story turns, chaining
 * `previous_interaction_id` to preserve visual style and character consistency.
 */

import { GoogleGenAI } from "@google/genai";
import { AppConfig } from "../types";
import { playMusic } from "./music-tool";

/**
 * Generates an illustration for the current story scene and chains interaction context.
 *
 * @param prompt - Detailed scene description to illustrate.
 * @param ai - Initialized GoogleGenAI SDK client.
 * @param config - Active application configuration.
 * @param previousInteractionId - Optional interaction ID from the prior story scene.
 * @param onInteractionCreated - Callback invoked with the new `interaction.id`.
 * @returns A data URL (`data:image/...;base64,...`) containing the generated scene image.
 */
export async function generateStoryImage(
  prompt: string,
  ai: GoogleGenAI,
  config: AppConfig,
  previousInteractionId: string | null,
  onInteractionCreated: (interactionId: string) => void
): Promise<string> {
  console.info(
    `[Tool] generateStoryImage called with prompt="${prompt}", previousInteractionId=${previousInteractionId || "none"}`
  );
  if (config.music?.accompany) {
    console.info("generateStoryImage: Triggering accompanying background music.");
    playMusic(prompt, config);
  }

  const promptText = `Generate a fantasy-style image based on the following description: ${prompt}. Maintain a consistent art style with any previous images in this conversation.`;

  console.info(
    `[LLM Call] generateStoryImage -> ai.interactions.create(model=${config.imageEditModel})`,
    {
      model: config.imageEditModel,
      previous_interaction_id: previousInteractionId || undefined,
      prompt: promptText,
    }
  );

  const interaction = await ai.interactions.create({
    model: config.imageEditModel,
    input: promptText,
    ...(previousInteractionId
      ? { previous_interaction_id: previousInteractionId }
      : {}),
  });

  if (interaction.id) {
    onInteractionCreated(interaction.id);
  }

  const generatedImage = interaction.output_image;
  if (generatedImage?.data) {
    const mimeType = generatedImage.mime_type || "image/png";
    const imageUrl = `data:${mimeType};base64,${generatedImage.data}`;
    console.info(
      `[LLM Response] generateStoryImage <- interaction.id=${interaction.id}`,
      {
        outputImageMimeType: mimeType,
        outputImageBase64Length: generatedImage.data.length,
      }
    );
    return imageUrl;
  }

  throw new Error("Image generation failed, no image data in response.");
}
