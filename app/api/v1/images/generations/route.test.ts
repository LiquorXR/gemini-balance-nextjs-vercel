import { configService } from "@/lib/config";
import { keyService } from "@/lib/services/key.service";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { POST } from "./route";

// Mock services
vi.mock("@/lib/services/key.service");
vi.mock("@/lib/config");

// Mock fetch
global.fetch = vi.fn();

describe("Images API Route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (keyService.getNextWorkingKey as Mock).mockResolvedValue("test-api-key");
    (configService.get as Mock).mockResolvedValue(3); // Default MAX_RETRIES
  });

  it("should return a successful image generation response", async () => {
    // Arrange
    const mockGeminiResponse = {
      data: [{ url: "http://example.com/image.png" }],
    };
    (fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGeminiResponse),
    });

    const requestBody = {
      prompt: "A cute baby sea otter",
      n: 1,
      size: "1024x1024",
      model: "imagen-3.0-generate-002",
    };
    const request = new Request("http://localhost/api/v1/images/generations", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.data[0].url).toBe("http://example.com/image.png");
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
      prompt: "A cute baby sea otter",
      n: 1,
      size: "1024x1024",
      model: "imagen-3.0-generate-002",
    };
    const request = new Request("http://localhost/api/v1/images/generations", {
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
