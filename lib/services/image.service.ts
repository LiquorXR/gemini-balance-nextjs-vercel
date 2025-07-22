import { NextResponse } from "next/server";

interface OpenAIImageRequest {
  prompt: string;
  n?: number;
  size?: string;
  model: string;
}

interface GeminiImagePayload {
  prompt: string;
  n?: number;
  size?: string;
}

interface GeminiImageResponse {
  data: { url: string }[];
}

/**
 * Converts an OpenAI image generation request to a Gemini-compatible request.
 * Note: The proposal is simplified. Real-world mapping might be more complex.
 * @param openaiRequest - The original request from an OpenAI-compatible client.
 * @returns The request body for the Gemini API.
 */
export function buildGeminiImagePayload(
  openaiRequest: OpenAIImageRequest
): GeminiImagePayload {
  return {
    prompt: openaiRequest.prompt,
    n: openaiRequest.n,
    size: openaiRequest.size,
    // Other parameters like quality, style would be mapped here.
  };
}

/**
 * Converts a Gemini image generation response to an OpenAI-compatible response.
 * @param geminiResponse - The response from the Gemini API.
 * @returns A NextResponse object with the OpenAI-compatible payload.
 */
export function convertGeminiToOpenAIImageResponse(
  geminiResponse: GeminiImageResponse
): NextResponse {
  return NextResponse.json({
    created: Math.floor(Date.now() / 1000),
    data: geminiResponse.data.map((image) => ({ url: image.url })),
  });
}

/**
 * Creates an image using the Gemini API (via a hypothetical internal endpoint).
 * @param geminiRequest - The request body for the Gemini API.
 * @param apiKey - The Google AI API key.
 * @param model - The model name for image generation.
 * @returns The response from the Gemini API.
 */
export async function createGeminiImage(
  geminiRequest: GeminiImagePayload,
  apiKey: string,
  model: string
): Promise<GeminiImageResponse> {
  // The proposal mentions "internal call to imagen", which is simplified here.
  // We'll use a hypothetical endpoint structure.
  const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImage?key=${apiKey}`;

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
    throw new Error("Failed to fetch image from Gemini API");
  }

  return await res.json();
}
