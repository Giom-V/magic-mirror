import { GoogleGenAI, Part } from "@google/genai";
import config from "../config.json";
import { UseMediaStreamResult } from "../hooks/use-media-stream-mux";

function fileToGenerativePart(data: string, mimeType: string): Part {
  return {
    inlineData: {
      data,
      mimeType,
    },
  };
}

export async function disguiseCameraImage(
  disguise_character: string,
  webcam: UseMediaStreamResult,
  setEditedImage: (image: string | null) => void
) {
  console.log("Using tool: disguise_camera_image");
  const stream = await webcam.start();
  const video = document.createElement("video");
  video.srcObject = stream;
  video.autoplay = true;
  video.play();

  video.addEventListener("loadeddata", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg");
    const base64Data = dataUrl.split(",")[1];

    const ai = new GoogleGenAI({
      apiKey: process.env.REACT_APP_GEMINI_API_KEY as string,
    });
    const imagePart = fileToGenerativePart(base64Data, "image/jpeg");

    const response = await ai.models.generateContent({
      model: config.imageEditModel,
      contents: [
        imagePart,
        `transform me into ${disguise_character}. Also feel free to slightly change the background for a more dreamy one.`,
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
          setEditedImage(imageUrl);
        }
      }
    }
    webcam.stop();
  });
}
