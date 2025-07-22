import {
  buildGeminiEmbeddingPayload,
  convertGeminiToOpenAIEmbeddingResponse,
  createGeminiEmbedding,
} from "@/lib/services/embedding.service";
import { withRetryHandling } from "@/lib/utils/withRetryHandling";
import { NextResponse } from "next/server";

export const runtime = "edge";

async function handler(req: Request) {
  try {
    const requestBody = await req.json();
    const model = requestBody.model;

    const execute = async (apiKey: string) => {
      const geminiPayload = buildGeminiEmbeddingPayload(requestBody);
      const geminiResponse = await createGeminiEmbedding(
        geminiPayload,
        apiKey,
        model
      );
      return convertGeminiToOpenAIEmbeddingResponse(geminiResponse, model);
    };

    return await withRetryHandling(execute, {
      modelName: model,
      requestBody,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("[Embeddings API Error]", error);
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
