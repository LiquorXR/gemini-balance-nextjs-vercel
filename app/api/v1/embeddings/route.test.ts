import { configService } from "@/lib/config";
import { keyService } from "@/lib/services/key.service";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { POST } from "./route";

// Mock services
vi.mock("@/lib/services/key.service");
vi.mock("@/lib/config");

// Mock fetch
global.fetch = vi.fn();

describe("Embeddings API Route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (keyService.getNextWorkingKey as Mock).mockResolvedValue("test-api-key");
    (configService.get as Mock).mockResolvedValue(3); // Default MAX_RETRIES
  });

  it("should return a successful embedding response", async () => {
    // Arrange
    const mockGeminiResponse = {
      embedding: {
        values: [0.1, 0.2, 0.3],
      },
    };
    (fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGeminiResponse),
    });

    const requestBody = {
      input: "Hello world",
      model: "text-embedding-004",
    };
    const request = new Request("http://localhost/api/v1/embeddings", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.object).toBe("list");
    expect(data.data[0].object).toBe("embedding");
    expect(data.data[0].embedding).toEqual([0.1, 0.2, 0.3]);
    expect(data.model).toBe("text-embedding-004");
    expect(keyService.handleApiFailure).not.toHaveBeenCalled();
  });

  it("should return a 500 error if all retries fail", async () => {
    // Arrange
    (keyService.getNextWorkingKey as Mock)
      .mockResolvedValueOnce("key1")
      .mockResolvedValueOnce("key2")
      .mockResolvedValueOnce("key3");

    (fetch as Mock).mockRejectedValue(new Error("API error"));

    const requestBody = {
      input: "Hello world",
      model: "text-embedding-004",
    };
    const request = new Request("http://localhost/api/v1/embeddings", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error.type).toBe("server_error");
    expect(keyService.handleApiFailure).toHaveBeenCalledTimes(3);
  });
});
