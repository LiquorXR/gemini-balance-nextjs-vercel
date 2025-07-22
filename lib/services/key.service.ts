import { configService } from "@/lib/config";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { and, asc, eq, lt, sql } from "drizzle-orm";

export class KeyService {
  async getNextWorkingKey(): Promise<string | null> {
    if (process.env.NODE_ENV !== "production") {
      return "mock_api_key";
    }

    const maxFailures = (await configService.get("MAX_FAILURES")) ?? 5;

    const availableKeys = await db.query.apiKeys.findMany({
      where: and(
        eq(apiKeys.isEnabled, true),
        lt(apiKeys.failureCount, maxFailures)
      ),
      orderBy: asc(apiKeys.lastUsedAt),
      limit: 1,
    });

    if (availableKeys.length === 0) {
      return null;
    }

    const selectedKey = availableKeys[0].key;

    // Update the last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.key, selectedKey));

    return selectedKey;
  }

  async handleApiFailure(apiKey: string): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    await db
      .update(apiKeys)
      .set({ failureCount: sql`${apiKeys.failureCount} + 1` })
      .where(eq(apiKeys.key, apiKey));
  }

  async resetKeyFailureCount(apiKey: string): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    await db
      .update(apiKeys)
      .set({ failureCount: 0 })
      .where(eq(apiKeys.key, apiKey));
  }

  async recoverDisabledKeys(): Promise<{ recovered: number; failed: number }> {
    if (process.env.NODE_ENV !== "production") {
      return { recovered: 0, failed: 0 };
    }

    const maxFailures = (await configService.get("MAX_FAILURES")) ?? 5;
    const disabledKeys = await db.query.apiKeys.findMany({
      where: and(
        eq(apiKeys.isEnabled, true),
        lt(apiKeys.failureCount, maxFailures)
      ),
    });

    let recovered = 0;
    let failed = 0;

    for (const { key } of disabledKeys) {
      try {
        // A simple health check could be to list models
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
        );
        if (response.ok) {
          await this.resetKeyFailureCount(key);
          recovered++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { recovered, failed };
  }
}

export const keyService = new KeyService();
