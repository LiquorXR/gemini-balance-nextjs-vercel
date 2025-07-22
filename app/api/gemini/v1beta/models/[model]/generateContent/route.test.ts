import { configService } from "@/lib/config";
import { chatService } from "@/lib/services/chat.service";
import { keyService } from "@/lib/services/key.service";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { POST } from "./route";

// Mock services
vi.mock("@/lib/services/key.service");
vi.mock("@/lib/config");
vi.mock("@/lib/services/chat.service");

describe("Gemini GenerateContent API Route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (keyService.getNextWorkingKey as Mock).mockResolvedValue("test-api-key");
    (configService.get as Mock).mockResolvedValue(3);
  });

  it("should return a successful response from gemini", async () => {
    // Arrange
    const mockResponse = { candidates: [] };
    (chatService.createNativeCompletion as Mock).mockResolvedValue(
      mockResponse
    );

    const requestBody = { contents: [] };
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    const params = { params: { model: "gemini-pro" } };

    // Act
    const response = await POST(request, params);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual(mockResponse);
  });
});
