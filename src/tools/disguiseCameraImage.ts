import { GoogleGenAI, Part } from "@google/genai";
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
  config: AppConfig
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    console.log(
      `Using tool: disguise_camera_image with character: ${disguise_character}`
    );
    if (config.music?.accompany) {
      playMusic(
        `a fairy tale music that would go with a picture of me as ${disguise_character}`,
      config
      );
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

        console.log("disguiseCameraImage: Sending image to model for editing...");
        const ai = new GoogleGenAI({
          apiKey: process.env.REACT_APP_GEMINI_API_KEY as string,
        });
        const imagePart = fileToGenerativePart(base64Data, "image/jpeg");

        const response = await ai.models.generateContent({
          model: config.imageEditModel,
          contents: [
            imagePart,
            (
          config.disguisePromptTemplate ||
          "transform me into ${disguise_character}, but keep my face as much as possible. Also feel free to change the background to something that fits the character."
        ).replace("${disguise_character}", disguise_character),
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
