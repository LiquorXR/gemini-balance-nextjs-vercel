// region: Types
interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIChatRequest {
  messages: OpenAIMessage[];
  // Other properties like model, temperature, etc. are omitted for now
}

interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiSystemInstruction {
  role: "system";
  parts: { text: string }[];
}

interface GeminiChatRequest {
  contents: GeminiContent[];
  systemInstruction?: GeminiSystemInstruction;
}

export interface GeminiChatResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: "model";
    };
    finishReason: "STOP" | "MAX_TOKENS" | "SAFETY" | "RECITATION" | "OTHER";
    index: number;
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  }[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface OpenAIChatCompletion {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason:
      | "stop"
      | "length"
      | "function_call"
      | "content_filter"
      | "null";
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
// endregion: Types

export class ChatService {
  async createCompletion(
    request: OpenAIChatRequest,
    requestOptions: { model: string; apiKey: string }
  ): Promise<OpenAIChatCompletion> {
    const geminiRequest = this.convertOpenAIMessagesToGemini(request.messages);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${requestOptions.model}:generateContent?key=${requestOptions.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(geminiRequest),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(
        `Gemini API request failed: ${geminiResponse.statusText}`
      );
    }

    const geminiData = await geminiResponse.json();
    return this.convertGeminiResponseToOpenAI(geminiData, requestOptions.model);
  }

  private convertOpenAIMessagesToGemini(
    messages: OpenAIMessage[]
  ): GeminiChatRequest {
    const geminiRequest: GeminiChatRequest = { contents: [] };
    const systemMessage = messages.find((msg) => msg.role === "system");

    if (systemMessage) {
      geminiRequest.systemInstruction = {
        role: "system",
        parts: [{ text: systemMessage.content }],
      };
    }

    geminiRequest.contents = messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

    return geminiRequest;
  }

  private convertGeminiResponseToOpenAI(
    geminiResponse:
      | GeminiChatResponse
      | { candidates: GeminiChatResponse["candidates"] },
    model: string = ""
  ): OpenAIChatCompletion {
    const now = Math.floor(Date.now() / 1000);
    const choice = geminiResponse.candidates?.[0];

    const finishReasonMap: Record<
      GeminiChatResponse["candidates"][0]["finishReason"],
      OpenAIChatCompletion["choices"][0]["finish_reason"]
    > = {
      STOP: "stop",
      MAX_TOKENS: "length",
      SAFETY: "content_filter",
      RECITATION: "content_filter",
      OTHER: "stop",
    };

    return {
      id: `chatcmpl-${now}`, // Simple timestamp-based ID
      object: "chat.completion",
      created: now,
      model: model,
      choices: choice
        ? [
            {
              index: 0,
              message: {
                role: "assistant",
                content: choice.content.parts[0].text,
              },
              finish_reason: finishReasonMap[choice.finishReason] || "stop",
            },
          ]
        : [],
      usage: {
        prompt_tokens:
          (geminiResponse as GeminiChatResponse).usageMetadata
            ?.promptTokenCount || 0,
        completion_tokens:
          (geminiResponse as GeminiChatResponse).usageMetadata
            ?.candidatesTokenCount || 0,
        total_tokens:
          (geminiResponse as GeminiChatResponse).usageMetadata
            ?.totalTokenCount || 0,
      },
    };
  }

  async createStreamCompletion(
    request: OpenAIChatRequest,
    requestOptions: { model: string; apiKey: string }
  ): Promise<ReadableStream> {
    const geminiRequest = this.convertOpenAIMessagesToGemini(request.messages);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${requestOptions.model}:streamGenerateContent?key=${requestOptions.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(geminiRequest),
      }
    );

    if (!geminiResponse.ok || !geminiResponse.body) {
      throw new Error("Gemini API stream request failed");
    }

    return geminiResponse.body.pipeThrough(
      this._createStreamTransformer(requestOptions.model)
    );
  }

  async getBaseModels(
    apiKey: string
  ): Promise<{ name: string; displayName: string }[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch base models from Gemini");
    }
    const data = await response.json();
    return data.models;
  }

  private _createStreamTransformer(model: string): TransformStream {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    return new TransformStream({
      transform: (chunk: Uint8Array, controller) => {
        buffer += decoder.decode(chunk);
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const geminiChunk = JSON.parse(line.substring(6));
              const openAIChunk = this.convertGeminiResponseToOpenAI(
                geminiChunk,
                model
              );
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`)
              );
            } catch (error) {
              console.error("Error parsing stream chunk:", error);
            }
          }
        }
      },
      flush: (controller) => {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      },
    });
  }

  async createNativeCompletion(
    request: GeminiChatRequest,
    requestOptions: { model: string; apiKey: string }
  ): Promise<GeminiChatResponse> {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${requestOptions.model}:generateContent?key=${requestOptions.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(
        `Gemini API request failed: ${geminiResponse.statusText}`
      );
    }

    return await geminiResponse.json();
  }

  async createNativeStreamCompletion(
    request: GeminiChatRequest,
    requestOptions: { model: string; apiKey: string }
  ): Promise<ReadableStream> {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${requestOptions.model}:streamGenerateContent?key=${requestOptions.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!geminiResponse.ok || !geminiResponse.body) {
      throw new Error("Gemini API stream request failed");
    }

    return geminiResponse.body;
  }
}

export const chatService = new ChatService();
