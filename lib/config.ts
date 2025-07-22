import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

// Define a type for all possible settings to ensure type safety
type AppConfig = {
  AUTH_TOKEN: string;
  MAX_FAILURES: number;
  MAX_RETRIES: number;
  SEARCH_MODELS: string[];
  IMAGE_MODELS: string[];
  // Add other settings keys here as needed
};

class ConfigService {
  private config: Partial<AppConfig> = {};
  private isInitialized = false;

  private async initialize() {
    if (this.isInitialized) return;

    if (process.env.NODE_ENV === "production") {
      const allSettings = await db.select().from(settings);
      for (const setting of allSettings) {
        this.setConfigValue(setting.key as keyof AppConfig, setting.value);
      }
    } else {
      // Use default values for development
      this.config = {
        AUTH_TOKEN: "default_token",
        MAX_FAILURES: 10,
        MAX_RETRIES: 3,
        SEARCH_MODELS: ["gemini-1.5-flash"],
        IMAGE_MODELS: ["gemini-1.5-flash"],
      };
    }

    this.isInitialized = true;
  }

  private setConfigValue<T extends keyof AppConfig>(key: T, value: string) {
    this.config[key] = this.parseValue(key, value);
  }

  private parseValue<T extends keyof AppConfig>(
    key: T,
    value: string
  ): AppConfig[T] {
    switch (key) {
      case "MAX_FAILURES":
      case "MAX_RETRIES":
        return parseInt(value, 10) as AppConfig[T];
      case "SEARCH_MODELS":
      case "IMAGE_MODELS":
        return value.split(",").map((s) => s.trim()) as AppConfig[T];
      default:
        return value as AppConfig[T];
    }
  }

  public async get<T extends keyof AppConfig>(
    key: T
  ): Promise<AppConfig[T] | undefined> {
    await this.initialize();
    return this.config[key];
  }
}

export const configService = new ConfigService();
