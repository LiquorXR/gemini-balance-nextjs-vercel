import { configService } from "@/lib/config";
import { keyService } from "@/lib/services/key.service";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { withRetryHandling } from "./withRetryHandling";

vi.mock("@/lib/services/key.service", () => ({
  keyService: {
    getNextWorkingKey: vi.fn(),
    handleApiFailure: vi.fn(),
  },
}));

vi.mock("@/lib/config", () => ({
  configService: {
    get: vi.fn(),
  },
}));

describe("withRetryHandling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return the result on the first successful attempt", async () => {
    const handler = vi.fn().mockResolvedValue("success");
    vi.spyOn(keyService, "getNextWorkingKey").mockResolvedValue("key1");
    vi.spyOn(configService, "get").mockResolvedValue(3);

    const result = await withRetryHandling(handler);

    expect(result).toBe("success");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("key1");
    expect(keyService.getNextWorkingKey).toHaveBeenCalledTimes(1);
    expect(keyService.handleApiFailure).not.toHaveBeenCalled();
  });

  it("should retry on failure and succeed on the second attempt", async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");
    vi.spyOn(keyService, "getNextWorkingKey")
      .mockResolvedValueOnce("key1")
      .mockResolvedValueOnce("key2");
    vi.spyOn(configService, "get").mockResolvedValue(3);

    const result = await withRetryHandling(handler);

    expect(result).toBe("success");
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith("key1");
    expect(handler).toHaveBeenCalledWith("key2");
    expect(keyService.getNextWorkingKey).toHaveBeenCalledTimes(2);
    expect(keyService.handleApiFailure).toHaveBeenCalledTimes(1);
    expect(keyService.handleApiFailure).toHaveBeenCalledWith("key1");
  });

  it("should throw an error after all retries fail", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("fail"));
    vi.spyOn(keyService, "getNextWorkingKey").mockResolvedValue("key");
    vi.spyOn(configService, "get").mockResolvedValue(3);

    await expect(withRetryHandling(handler)).rejects.toThrow("fail");

    expect(handler).toHaveBeenCalledTimes(3);
    expect(keyService.getNextWorkingKey).toHaveBeenCalledTimes(3);
    expect(keyService.handleApiFailure).toHaveBeenCalledTimes(3);
  });

  it("should throw an error if no working keys are available", async () => {
    const handler = vi.fn();
    vi.spyOn(keyService, "getNextWorkingKey").mockResolvedValue(null);
    vi.spyOn(configService, "get").mockResolvedValue(3);

    await expect(withRetryHandling(handler)).rejects.toThrow(
      "No available API keys after multiple retries."
    );

    expect(handler).not.toHaveBeenCalled();
  });
});
