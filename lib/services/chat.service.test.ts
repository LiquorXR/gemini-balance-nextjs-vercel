import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeminiChatResponse, OpenAIChatRequest } from "./chat.service";
import { ChatService } from "./chat.service";

vi.mock("./key.service", () => ({
  keyService: {
    getNextWorkingKey: vi.fn(),
    handleApiFailure: vi.fn(),
  },
}));

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Helper class to expose the private method for testing
class TestableChatService extends ChatService {
  public testConvertOpenAIMessagesToGemini(messages: OpenAIMessage[]) {
    // @ts-expect-error - Accessing private method for testing
    return this.convertOpenAIMessagesToGemini(messages);
  }

  public testConvertGeminiResponseToOpenAI(geminiResponse: GeminiChatResponse) {
    // @ts-expect-error - Accessing private method for testing
    return this.convertGeminiResponseToOpenAI(geminiResponse);
  }
}

describe("ChatService", () => {
  const chatService = new TestableChatService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCompletion", () => {
    it("should call Gemini API and return a converted response", async () => {
      const mockApiKey = "test-api-key";
      const mockModel = "gemini-pro";
      const mockOpenAIRequest: OpenAIChatRequest = {
        messages: [{ role: "user", content: "Hello" }],
      };
      const mockGeminiResponse: GeminiChatResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "Hi there!" }],
              role: "model",
            },
            finishReason: "STOP",
            index: 0,
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 1,
          candidatesTokenCount: 2,
          totalTokenCount: 3,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGeminiResponse),
      });

      const result = await chatService.createCompletion(mockOpenAIRequest, {
        model: mockModel,
        apiKey: mockApiKey,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `https://generativelanguage.googleapis.com/v1beta/models/${mockModel}:generateContent?key=${mockApiKey}`,
        expect.any(Object)
      );
      expect(result.choices[0].message.content).toBe("Hi there!");
    });
  });

  describe("createStreamCompletion", () => {
    it("should call Gemini stream API and return a transformed stream", async () => {
      const mockApiKey = "test-api-key";
      const mockModel = "gemini-pro";
      const mockOpenAIRequest: OpenAIChatRequest = {
        messages: [{ role: "user", content: "Hello" }],
      };
      const encoder = new TextEncoder();
      const mockGeminiStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"candidates": [{"content": {"parts": [{"text": "Hello"}]}}]}\n\n'
            )
          );
          controller.enqueue(
            encoder.encode(
              'data: {"candidates": [{"content": {"parts": [{"text": " World"}]}}]}\n\n'
            )
          );
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: mockGeminiStream,
      });

      const stream = await chatService.createStreamCompletion(
        mockOpenAIRequest,
        { model: mockModel, apiKey: mockApiKey }
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }

      expect(result).toContain('data: {"id":"chatcmpl-');
      expect(result).toContain('"object":"chat.completion"');
      expect(result).toContain(
        '"choices":[{"index":0,"message":{"role":"assistant","content":"Hello"}'
      );
      expect(result).toContain(
        '"choices":[{"index":0,"message":{"role":"assistant","content":" World"}'
      );
      expect(result).toContain("data: [DONE]");
    });
  });

  describe("getBaseModels", () => {
    it("should fetch and return base models from Gemini", async () => {
      const mockApiKey = "test-api-key";
      const mockModels = [{ name: "gemini-pro" }, { name: "gemini-ultra" }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: mockModels }),
      });

      const result = await chatService.getBaseModels(mockApiKey);

      expect(global.fetch).toHaveBeenCalledWith(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${mockApiKey}`
      );
      expect(result).toEqual(mockModels);
    });
  });

  describe("convertOpenAIMessagesToGemini", () => {
    it("should convert messages without a system message correctly", () => {
      const openAIMessages: OpenAIMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "How are you?" },
      ];

      const expectedGeminiRequest = {
        contents: [
          { role: "user", parts: [{ text: "Hello" }] },
          { role: "model", parts: [{ text: "Hi there!" }] },
          { role: "user", parts: [{ text: "How are you?" }] },
        ],
      };

      const result =
        chatService.testConvertOpenAIMessagesToGemini(openAIMessages);
      expect(result).toEqual(expectedGeminiRequest);
    });

    it("should handle a system message correctly", () => {
      const openAIMessages: OpenAIMessage[] = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello" },
      ];

      const expectedGeminiRequest = {
        systemInstruction: {
          role: "system",
          parts: [{ text: "You are a helpful assistant." }],
        },
        contents: [{ role: "user", parts: [{ text: "Hello" }] }],
      };

      const result =
        chatService.testConvertOpenAIMessagesToGemini(openAIMessages);
      expect(result).toEqual(expectedGeminiRequest);
    });

    it("should handle an empty message array", () => {
      const openAIMessages: OpenAIMessage[] = [];
      const expectedGeminiRequest = {
        contents: [],
      };
      const result =
        chatService.testConvertOpenAIMessagesToGemini(openAIMessages);
      expect(result).toEqual(expectedGeminiRequest);
    });
  });

  describe("convertGeminiResponseToOpenAI", () => {
    it("should convert a standard Gemini response to the OpenAI format", () => {
      const geminiResponse: GeminiChatResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "Hello, world!" }],
              role: "model",
            },
            finishReason: "STOP",
            index: 0,
            safetyRatings: [
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                probability: "NEGLIGIBLE",
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                probability: "NEGLIGIBLE",
              },
              {
                category: "HARM_CATEGORY_HARASSMENT",
                probability: "NEGLIGIBLE",
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                probability: "NEGLIGIBLE",
              },
            ],
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      };

      const result =
        chatService.testConvertGeminiResponseToOpenAI(geminiResponse);

      expect(result.id).toMatch(/^chatcmpl-/); // Check if ID has the correct prefix
      expect(result.object).toBe("chat.completion");
      expect(result.created).toBeCloseTo(Date.now() / 1000, -2);
      expect(result.model).toBe(""); // As per proposal, model is not part of the conversion
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].index).toBe(0);
      expect(result.choices[0].message.role).toBe("assistant");
      expect(result.choices[0].message.content).toBe("Hello, world!");
      expect(result.choices[0].finish_reason).toBe("stop");
      expect(result.usage.prompt_tokens).toBe(10);
      expect(result.usage.completion_tokens).toBe(20);
      expect(result.usage.total_tokens).toBe(30);
    });

    it("should handle Gemini response with no candidates", () => {
      const geminiResponse: GeminiChatResponse = {
        candidates: [],
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 0,
          totalTokenCount: 5,
        },
      };

      const result =
        chatService.testConvertGeminiResponseToOpenAI(geminiResponse);

      expect(result.choices).toHaveLength(0);
      expect(result.usage.prompt_tokens).toBe(5);
      expect(result.usage.completion_tokens).toBe(0);
      expect(result.usage.total_tokens).toBe(5);
    });

    it("should map finishReason correctly", () => {
      const geminiResponse: GeminiChatResponse = {
        candidates: [
          {
            content: { parts: [{ text: "..." }], role: "model" },
            finishReason: "MAX_TOKENS",
            index: 0,
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 1,
          candidatesTokenCount: 1,
          totalTokenCount: 2,
        },
      };

      const result =
        chatService.testConvertGeminiResponseToOpenAI(geminiResponse);
      expect(result.choices[0].finish_reason).toBe("length");
    });
  });
});
