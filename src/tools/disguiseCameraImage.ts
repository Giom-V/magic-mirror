/**
 * Webcam capture and character transformation tool using the Gemini Interactions API.
 *
 * Captures a frame from the user's webcam, sends it to the Nano Banana image model
 * (`config.imageEditModel`) via `ai.interactions.create`, and stores the resulting
 * `interaction.id` so subsequent edits can chain via `previous_interaction_id`.
 */

import { GoogleGenAI } from "@google/genai";
import { UseMediaStreamResult } from "../hooks/use-media-stream-mux";
import { AppConfig } from "../types";
import { playMusic } from "./music-tool";

/**
 * Captures a webcam frame and transforms the user into the requested fantasy character.
 *
 * @param disguise_character - Character description to transform the user into.
 * @param webcam - Webcam stream controller hook result.
 * @param config - Active application configuration.
 * @param ai - Initialized GoogleGenAI SDK client.
 * @param onInteractionCreated - Callback invoked with the new `interaction.id` for multi-turn editing.
 * @returns A data URL (`data:image/...;base64,...`) containing the generated image.
 */
export function disguiseCameraImage(
  disguise_character: string,
  webcam: UseMediaStreamResult,
  config: AppConfig,
  ai: GoogleGenAI,
  onInteractionCreated: (interactionId: string) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    console.info(
      `[Tool] disguiseCameraImage called with character="${disguise_character}"`
    );
    if (config.music?.accompany) {
      const musicPrompt = config.disguiseMusicPromptTemplate.replace(
        /\$\{disguise_character\}/g,
        disguise_character
      );
      playMusic(musicPrompt, config);
    }
    try {
      const stream = await webcam.start();
      const video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      video.play();

      video.addEventListener("loadeddata", async () => {
        console.info("disguiseCameraImage: Video frame loaded from webcam.");
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          webcam.stop();
          return reject("Could not get canvas context");
        }

        if (config.camera?.orientation === "vertical") {
          canvas.width = video.videoHeight;
          canvas.height = video.videoWidth;
          ctx.translate(video.videoHeight, 0);
          ctx.rotate(Math.PI / 2);
        }

        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL("image/jpeg");
        const base64Data = dataUrl.split(",")[1];
        const promptText = config.disguisePromptTemplate.replace(
          /\$\{disguise_character\}/g,
          disguise_character
        );

        console.info(
          `[LLM Call] disguiseCameraImage -> ai.interactions.create(model=${config.imageEditModel})`,
          {
            model: config.imageEditModel,
            prompt: promptText,
            inputImageMimeType: "image/jpeg",
            inputImageBase64Length: base64Data.length,
          }
        );

        try {
          const interaction = await ai.interactions.create({
            model: config.imageEditModel,
            input: [
              {
                type: "text",
                text: promptText,
              },
              {
                type: "image",
                mime_type: "image/jpeg",
                data: base64Data,
              },
            ],
          });

          if (interaction.id) {
            onInteractionCreated(interaction.id);
          }

          const generatedImage = interaction.output_image;
          if (generatedImage?.data) {
            const mimeType = generatedImage.mime_type || "image/png";
            const imageUrl = `data:${mimeType};base64,${generatedImage.data}`;
            console.info(
              `[LLM Response] disguiseCameraImage <- interaction.id=${interaction.id}`,
              {
                outputImageMimeType: mimeType,
                outputImageBase64Length: generatedImage.data.length,
              }
            );
            webcam.stop();
            resolve(imageUrl);
            return;
          }

          console.error(
            "disguiseCameraImage: Image editing failed, no output_image in interaction response.",
            interaction
          );
          webcam.stop();
          reject("No image data in response");
        } catch (err) {
          console.error(
            "disguiseCameraImage: Error during Interactions API call:",
            err
          );
          webcam.stop();
          reject(err);
        }
      });

      video.addEventListener("error", (e) => {
        console.error("disguiseCameraImage: Video error:", e);
        webcam.stop();
        reject("Video element error");
      });
    } catch (error) {
      console.error("disguiseCameraImage: Error in disguise process:", error);
      webcam.stop();
      reject(error);
    }
  });
}
