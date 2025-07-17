import { cycle } from "itertools";
import { Agent } from "http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { prisma } from "./db";
import logger from "./logger";
import { getSettings } from "./settings";

const GOOGLE_API_HOST =
  process.env.GOOGLE_API_HOST || "https://generativelanguage.googleapis.com";

interface FetchOptions extends RequestInit {
  agent?: Agent;
}

/**
 * Manages a pool of API keys, providing round-robin selection,
 * failure tracking, and automatic recovery.
 */
export class KeyManager {
  private keys: readonly string[];
  private keyCycle: IterableIterator<string>;
  private failureCounts: Map<string, number>;
  private lastFailureTimes: Map<string, Date>;
  private readonly maxFailures: number;

  constructor(keys: string[], maxFailures: number = 3) {
    const initialKeys = keys || [];
    if (initialKeys.length === 0) {
      logger.warn(
        "KeyManager initialized with zero keys. Waiting for user to add keys via UI."
      );
    }
    this.keys = Object.freeze([...initialKeys]);
    this.keyCycle = cycle(this.keys);
    this.failureCounts = new Map(this.keys.map((key) => [key, 0]));
    this.lastFailureTimes = new Map();
    this.maxFailures = maxFailures;
    logger.info(
      `KeyManager initialized with ${this.keys.length} keys from database.`
    );
  }

  public isKeyValid(key: string): boolean {
    const failures = this.failureCounts.get(key);
    return failures !== undefined && failures < this.maxFailures;
  }

  public getNextWorkingKey(): string {
    if (this.keys.length === 0) {
      throw new Error("No API keys available in the key manager.");
    }
    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keyCycle.next().value;
      if (this.isKeyValid(key)) {
        return key;
      }
    }
    throw new Error(
      "All API keys are currently failing. Please check their validity or reset failure counts."
    );
  }

  public handleApiFailure(key: string): void {
    if (this.failureCounts.has(key)) {
      const currentFailures = this.failureCounts.get(key)!;
      this.failureCounts.set(key, currentFailures + 1);
      this.lastFailureTimes.set(key, new Date());
      logger.warn(
        { key: `...${key.slice(-4)}`, failures: currentFailures + 1 },
        `Failure recorded for key.`
      );
    }
  }

  public resetKeyFailureCount(key: string): void {
    if (this.failureCounts.has(key)) {
      this.failureCounts.set(key, 0);
      this.lastFailureTimes.delete(key);
      logger.info(
        { key: `...${key.slice(-4)}` },
        `Failure count reset for key.`
      );
    }
  }

  public getAllKeys(): {
    key: string;
    failCount: number;
    isWorking: boolean;
    lastFailedAt: Date | null;
  }[] {
    return this.keys.map((key) => {
      const failCount = this.failureCounts.get(key)!;
      return {
        key,
        failCount,
        isWorking: this.isKeyValid(key),
        lastFailedAt: this.lastFailureTimes.get(key) || null,
      };
    });
  }

  public async verifyKey(key: string): Promise<boolean> {
    try {
      const settings = await getSettings();
      const healthCheckModel = settings.HEALTH_CHECK_MODEL;
      const url = `${GOOGLE_API_HOST}/v1beta/models/${healthCheckModel}:generateContent?key=${key}`;

      const fetchOptions: FetchOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }),
      };

      if (settings.PROXY_URL) {
        fetchOptions.agent = new HttpsProxyAgent(settings.PROXY_URL);
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          `Health check failed with status ${
            response.status
          }: ${JSON.stringify(errorBody)}`
        );
      }

      this.resetKeyFailureCount(key);
      logger.info(
        { key: `...${key.slice(-4)}` },
        "Key is now active after successful health check."
      );
      return true;
    } catch (error) {
      logger.warn(
        {
          key: `...${key.slice(-4)}`,
          error: error instanceof Error ? error.message : String(error),
        },
        "Key remains inactive after failed health check."
      );
      return false;
    }
  }

  public async checkAndReactivateKeys(): Promise<void> {
    logger.info("Starting hourly check for inactive API keys...");
    const inactiveKeys = this.keys.filter((key) => !this.isKeyValid(key));

    if (inactiveKeys.length === 0) {
      logger.info("No inactive keys to check.");
      return;
    }

    logger.info(`Found ${inactiveKeys.length} inactive keys to check.`);

    for (const key of inactiveKeys) {
      await this.verifyKey(key);
    }
  }
}

// --- Singleton Instance ---

// A more robust singleton pattern that works across hot-reloads in development.
const globalWithKeyManager = global as typeof global & {
  keyManagerPromise: Promise<KeyManager> | null;
};

export function resetKeyManager() {
  if (globalWithKeyManager.keyManagerPromise) {
    globalWithKeyManager.keyManagerPromise = null;
    logger.info("KeyManager instance reset.");
  }
}

async function createKeyManager(): Promise<KeyManager> {
  // 1. Load keys exclusively from the database
  const keysFromDb = (await prisma.apiKey.findMany()).map(
    (k: { key: string }) => k.key
  );

  // 2. Load settings using the settings service
  const settings = await getSettings();
  const maxFailures = settings.MAX_FAILURES;

  // 3. Initialize KeyManager with the keys from the database
  return new KeyManager(keysFromDb, maxFailures);
}

/**
 * Returns the singleton instance of the KeyManager.
 */
export function getKeyManager(): Promise<KeyManager> {
  if (!globalWithKeyManager.keyManagerPromise) {
    logger.info("No existing KeyManager instance found, creating a new one.");
    globalWithKeyManager.keyManagerPromise = createKeyManager();
  } else {
    logger.info("Returning existing KeyManager instance.");
  }
  return globalWithKeyManager.keyManagerPromise;
}
