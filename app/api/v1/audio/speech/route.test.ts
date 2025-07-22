import { configService } from "@/lib/config";
import { keyService } from "@/lib/services/key.service";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { POST } from "./route";

// Mock services
vi.mock("@/lib/services/key.service");
vi.mock("@/lib/config");

// Mock fetch
global.fetch = vi.fn();

describe("Audio API Route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (keyService.getNextWorkingKey as Mock).mockResolvedValue("test-api-key");
    (configService.get as Mock).mockResolvedValue(3); // Default MAX_RETRIES
  });

  it("should return a successful audio blob response", async () => {
    // Arrange
    const mockAudioBlob = new Blob(["audio data"], { type: "audio/mpeg" });
    (fetch as Mock).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockAudioBlob),
    });

    const requestBody = {
      input: "Hello world",
      model: "tts-1",
      voice: "alloy",
    };
    const request = new Request("http://localhost/api/v1/audio/speech", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
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
      model: "tts-1",
      voice: "alloy",
    };
    const request = new Request("http://localhost/api/v1/audio/speech", {
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
