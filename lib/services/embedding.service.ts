import { NextResponse } from "next/server";

interface OpenAIEmbeddingRequest {
  input: string | string[];
  model: string;
}

interface GeminiEmbeddingPayload {
  content: {
    parts: { text: string }[];
  };
}

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

/**
 * Converts an OpenAI embedding request to a Gemini embedding request.
 * @param openaiRequest - The original request from an OpenAI-compatible client.
 * @returns The request body for the Gemini API.
 */
export function buildGeminiEmbeddingPayload(
  openaiRequest: OpenAIEmbeddingRequest
): GeminiEmbeddingPayload {
  const inputText = Array.isArray(openaiRequest.input)
    ? openaiRequest.input.join(" ")
    : openaiRequest.input;

  return {
    content: {
      parts: [{ text: inputText }],
    },
  };
}

/**
 * Converts a Gemini embedding response to an OpenAI-compatible response.
 * @param geminiResponse - The response from the Gemini API.
 * @param model - The model name used for the embedding.
 * @returns A NextResponse object with the OpenAI-compatible payload.
 */
export function convertGeminiToOpenAIEmbeddingResponse(
  geminiResponse: GeminiEmbeddingResponse,
  model: string
): NextResponse {
  const embedding = geminiResponse.embedding;
  return NextResponse.json({
    object: "list",
    data: [
      {
        object: "embedding",
        embedding: embedding.values,
        index: 0,
      },
    ],
    model: model,
    usage: {
      prompt_tokens: 0, // Gemini API does not provide this
      total_tokens: 0, // Gemini API does not provide this
    },
  });
}

/**
 * Creates an embedding using the Gemini API.
 * @param geminiRequest - The request body for the Gemini API.
 * @param apiKey - The Google AI API key.
 * @returns The response from the Gemini API.
 */
export async function createGeminiEmbedding(
  geminiRequest: GeminiEmbeddingPayload,
  apiKey: string,
  model: string
): Promise<GeminiEmbeddingResponse> {
  const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const res = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(geminiRequest),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("Gemini API Error:", error);
    throw new Error("Failed to fetch embedding from Gemini API");
  }

  return await res.json();
}
