import {
  buildGeminiImagePayload,
  convertGeminiToOpenAIImageResponse,
  createGeminiImage,
} from "@/lib/services/image.service";
import { withRetryHandling } from "@/lib/utils/withRetryHandling";
import { NextResponse } from "next/server";

export const runtime = "edge";

async function handler(req: Request) {
  try {
    const requestBody = await req.json();
    const model = requestBody.model;

    const execute = async (apiKey: string) => {
      const geminiPayload = buildGeminiImagePayload(requestBody);
      const geminiResponse = await createGeminiImage(
        geminiPayload,
        apiKey,
        model
      );
      return convertGeminiToOpenAIImageResponse(geminiResponse);
    };

    return await withRetryHandling(execute);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("[Images API Error]", error);
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
