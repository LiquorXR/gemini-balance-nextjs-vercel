import { configService } from "@/lib/config";
import { chatService } from "@/lib/services/chat.service";
import { keyService } from "@/lib/services/key.service";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { POST } from "./route";

// Mock services
vi.mock("@/lib/services/key.service");
vi.mock("@/lib/config");
vi.mock("@/lib/services/chat.service");

describe("Gemini StreamGenerateContent API Route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (keyService.getNextWorkingKey as Mock).mockResolvedValue("test-api-key");
    (configService.get as Mock).mockResolvedValue(3);
  });

  it("should return a successful stream response from gemini", async () => {
    // Arrange
    const mockStream = new ReadableStream();
    (chatService.createNativeStreamCompletion as Mock).mockResolvedValue(
      mockStream
    );

    const requestBody = { contents: [] };
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    const params = { params: { model: "gemini-pro" } };

    // Act
    const response = await POST(request, params);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toBe(mockStream);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });
});
