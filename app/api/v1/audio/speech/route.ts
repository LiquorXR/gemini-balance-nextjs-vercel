import {
  buildGeminiAudioPayload,
  createGeminiSpeech,
} from "@/lib/services/audio.service";
import { withRetryHandling } from "@/lib/utils/withRetryHandling";
import { NextResponse } from "next/server";

export const runtime = "edge";

async function handler(req: Request) {
  try {
    const requestBody = await req.json();
    const model = requestBody.model;

    const execute = async (apiKey: string) => {
      const geminiPayload = buildGeminiAudioPayload(requestBody);
      const audioBlob = await createGeminiSpeech(geminiPayload, apiKey, model);
      // Return the audio blob directly with the correct content type.
      return new NextResponse(audioBlob, {
        headers: { "Content-Type": "audio/mpeg" },
      });
    };

    return await withRetryHandling(execute);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("[Audio API Error]", error);
    return NextResponse.json(
      {
        error: {
          message: errorMessage,
          type: "server_error",
        },
      },
      { status: 500 }
    );
  }
}

export { handler as POST };
