import { configService } from "@/lib/config";
import { chatService } from "@/lib/services/chat.service";
import { keyService } from "@/lib/services/key.service";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { GET } from "./route";

// Mock services
vi.mock("@/lib/services/key.service");
vi.mock("@/lib/config");
vi.mock("@/lib/services/chat.service");

describe("Gemini Models API Route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (keyService.getNextWorkingKey as Mock).mockResolvedValue("test-api-key");
    (configService.get as Mock).mockResolvedValue(3);
  });

  it("should return a list of gemini models", async () => {
    // Arrange
    const mockModels = [{ name: "gemini-pro" }];
    (chatService.getBaseModels as Mock).mockResolvedValue(mockModels);

    // Act
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.models).toEqual(mockModels);
  });
});
