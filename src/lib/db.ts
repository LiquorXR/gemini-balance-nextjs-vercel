import { Prisma, PrismaClient } from "@prisma/client";
import "server-only";

declare global {
  // allow global `var` declarations
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  const logLevels: Prisma.LogLevel[] =
    process.env.NODE_ENV === "production"
      ? ["warn", "error"]
      : ["query", "info", "warn", "error"];

  const client = new PrismaClient({
    log: logLevels,
  });

  return client;
};

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
