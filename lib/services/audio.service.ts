interface OpenAIAudioRequest {
  input: string;
  voice: string;
  model: string;
}

interface GeminiAudioPayload {
  input: string;
  voice: string;
}

/**
 * Converts an OpenAI speech request to a Gemini-compatible request.
 * @param openaiRequest - The original request from an OpenAI-compatible client.
 * @returns The request body for the Gemini API.
 */
export function buildGeminiAudioPayload(
  openaiRequest: OpenAIAudioRequest
): GeminiAudioPayload {
  return {
    input: openaiRequest.input,
    voice: openaiRequest.voice,
    // Other parameters would be mapped here.
  };
}

/**
 * Creates speech using the Gemini API (via a hypothetical internal endpoint).
 * @param geminiRequest - The request body for the Gemini API.
 * @param apiKey - The Google AI API key.
 * @param model - The model name for TTS.
 * @returns The response from the Gemini API, which is expected to be an audio blob.
 */
export async function createGeminiSpeech(
  geminiRequest: GeminiAudioPayload,
  apiKey: string,
  model: string
): Promise<Blob> {
  const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:synthesizeSpeech?key=${apiKey}`;

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
    throw new Error("Failed to fetch audio from Gemini API");
  }

  // For audio, the response body itself is the data.
  return res.blob();
}
