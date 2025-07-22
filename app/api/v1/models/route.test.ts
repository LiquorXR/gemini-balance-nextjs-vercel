import { configService } from "@/lib/config";
import { chatService } from "@/lib/services/chat.service";
import { withRetryHandling } from "@/lib/utils/withRetryHandling";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/services/chat.service");
vi.mock("@/lib/config");
vi.mock("@/lib/services/key.service");
vi.mock("@/lib/utils/withRetryHandling");

describe("GET /api/v1/models", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return a list of base and derived models", async () => {
    const mockBaseModels = [
      { name: "models/gemini-pro", displayName: "Gemini Pro" },
      { name: "models/gemini-ultra", displayName: "Gemini Ultra" },
    ];
    vi.spyOn(chatService, "getBaseModels").mockResolvedValue(mockBaseModels);
    vi.spyOn(configService, "get")
      .mockResolvedValueOnce(["gemini-pro"]) // SEARCH_MODELS
      .mockResolvedValueOnce(["gemini-ultra"]); // IMAGE_MODELS
    vi.mocked(withRetryHandling).mockImplementation(async (handler) => {
      return handler("test-key");
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.object).toBe("list");
    expect(data.data).toHaveLength(4);
    expect(
      data.data.some((m: { id: string }) => m.id === "gemini-pro-search")
    ).toBe(true);
    expect(
      data.data.some((m: { id: string }) => m.id === "gemini-ultra-image")
    ).toBe(true);
  });
});
