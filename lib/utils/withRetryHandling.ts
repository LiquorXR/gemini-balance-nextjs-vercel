import { configService } from "@/lib/config";
import { keyService } from "@/lib/services/key.service";
import { logService } from "@/lib/services/log.service";

type Handler<T> = (apiKey: string) => Promise<T>;

type RetryOptions = {
  modelName?: string;
  requestBody?: Record<string, unknown>;
};

export async function withRetryHandling<T>(
  handler: Handler<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = (await configService.get("MAX_RETRIES")) ?? 3;
  const { modelName, requestBody } = options;

  for (let i = 0; i < maxRetries; i++) {
    const startTime = Date.now();
    const apiKey = await keyService.getNextWorkingKey();
    if (!apiKey) {
      throw new Error("No available API keys after multiple retries.");
    }

    try {
      const result = await handler(apiKey);
      const latencyMs = Date.now() - startTime;

      logService.recordRequest({
        apiKey,
        modelName,
        isSuccess: true,
        statusCode: 200,
        latencyMs,
        createdAt: new Date(),
      });

      return result;
    } catch (error) {
      await keyService.handleApiFailure(apiKey);

      const errorData = {
        apiKey,
        modelName,
        requestBody: JSON.stringify(requestBody),
        createdAt: new Date(),
      };

      if (error instanceof Error) {
        logService.recordError({
          ...errorData,
          errorMessage: error.message,
        });
      } else {
        logService.recordError({
          ...errorData,
          errorMessage: "An unknown error occurred.",
        });
      }

      if (i === maxRetries - 1) {
        // Last retry failed, rethrow the error
        throw error;
      }
    }
  }

  throw new Error("Max retries reached, but no result was returned.");
}
