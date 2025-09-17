import { Chat, GoogleGenAI, Part } from "@google/genai";
import { UseMediaStreamResult } from "../hooks/use-media-stream-mux";
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

export function disguiseCameraImage(
  disguise_character: string,
  webcam: UseMediaStreamResult,
  config: AppConfig,
  ai: GoogleGenAI,
  onChatCreated: (chat: Chat) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    console.log(
      `Using tool: disguise_camera_image with character: ${disguise_character}`
    );
    if (config.music?.accompany) {
      const musicPrompt = config.disguiseMusicPromptTemplate.replace(
        "${disguise_character}",
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
        console.log("disguiseCameraImage: Video data loaded.");
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

        console.log(
          "disguiseCameraImage: Sending image to model for editing..."
        );
        const imagePart = fileToGenerativePart(base64Data, "image/jpeg");

        const chat = ai.chats.create({
          model: config.imageEditModel,
        });
        onChatCreated(chat);

        const response = await chat.sendMessage({
          message: [
            imagePart,
            config.disguisePromptTemplate.replace(
              "${disguise_character}",
              disguise_character
            ),
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
              console.log("disguiseCameraImage: Image edited successfully.");
              webcam.stop();
              resolve(imageUrl);
              return;
            }
          }
        }

        console.error(
          "disguiseCameraImage: Image editing failed, no image data in response."
        );
        webcam.stop();
        reject("No image data in response");
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
