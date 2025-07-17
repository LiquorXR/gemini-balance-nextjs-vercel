import pino from "pino";
import { formatApiKey } from "./utils";
import { prisma as db } from "./db";

const pinoConfig = {
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: ["apiKey", "key", "*.apiKey", "*.key"],
    censor: (value: unknown) => {
      if (typeof value === "string") {
        return formatApiKey(value);
      }
      return "[REDACTED]";
    },
  },
};

const logger = pino(pinoConfig);

interface LogErrorToDBParams {
  apiKey?: string;
  errorType: string;
  errorMessage: string;
  errorDetails?: string;
}

export async function logErrorToDB({
  apiKey,
  errorType,
  errorMessage,
  errorDetails,
}: LogErrorToDBParams) {
  await db.errorLog.create({
    data: {
      apiKey,
      errorType,
      errorMessage,
      errorDetails,
    },
  });
}

export default logger;
