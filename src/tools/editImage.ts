/**
 * Multi-turn conversational image editing tool using the Gemini Interactions API.
 *
 * Chains off a previous image generation/disguise interaction via
 * `previous_interaction_id` and returns the newly edited image.
 */

import { GoogleGenAI } from "@google/genai";
import { AppConfig } from "../types";
import { playMusic } from "./music-tool";

/**
 * Edits the previously generated or disguised image using `previous_interaction_id`.
 *
 * @param prompt - User's edit instruction (e.g. "add a hat", "change the background").
 * @param ai - Initialized GoogleGenAI SDK client.
 * @param previousInteractionId - Interaction ID from the previous image turn.
 * @param config - Active application configuration.
 * @param onInteractionUpdated - Optional callback to store the new `interaction.id` for further chained edits.
 * @returns A data URL (`data:image/...;base64,...`) containing the edited image.
 */
export async function editImage(
  prompt: string,
  ai: GoogleGenAI,
  previousInteractionId: string,
  config: AppConfig,
  onInteractionUpdated?: (interactionId: string) => void
): Promise<string> {
  console.info(
    `[Tool] editImage called with prompt="${prompt}", previousInteractionId=${previousInteractionId}`
  );
  if (config.music?.accompany) {
    const musicPrompt = config.editImageMusicPromptTemplate.replace(
      /\$\{prompt\}/g,
      prompt
    );
    playMusic(musicPrompt, config);
  }

  const promptText = config.editImagePromptTemplate.replace(
    /\$\{prompt\}/g,
    prompt
  );

  console.info(
    `[LLM Call] editImage -> ai.interactions.create(model=${config.imageEditModel}, previous_interaction_id=${previousInteractionId})`,
    {
      model: config.imageEditModel,
      previous_interaction_id: previousInteractionId,
      prompt: promptText,
    }
  );

  const interaction = await ai.interactions.create({
    model: config.imageEditModel,
    input: promptText,
    previous_interaction_id: previousInteractionId,
  });

  if (interaction.id && onInteractionUpdated) {
    onInteractionUpdated(interaction.id);
  }

  const generatedImage = interaction.output_image;
  if (generatedImage?.data) {
    const mimeType = generatedImage.mime_type || "image/png";
    const imageUrl = `data:${mimeType};base64,${generatedImage.data}`;
    console.info(
      `[LLM Response] editImage <- interaction.id=${interaction.id}`,
      {
        outputImageMimeType: mimeType,
        outputImageBase64Length: generatedImage.data.length,
      }
    );
    return imageUrl;
  }

  console.error(
    "editImage: Image editing failed, no output_image in interaction response.",
    interaction
  );
  throw new Error("No image data in response");
}
