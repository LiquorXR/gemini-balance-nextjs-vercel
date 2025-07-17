import { isAuthenticated } from "@/lib/auth";
import { proxyRequest } from "@/lib/gemini-proxy";
import { NextRequest, NextResponse } from "next/server";
import logger, { logErrorToDB } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const authError = await isAuthenticated(request);
    if (authError) {
      return authError;
    }
    return await proxyRequest(request, "/gemini");
  } catch (e: unknown) {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    logger.error({ error: e }, "Error in gemini/v1beta/[...model] route");

    try {
      if (e instanceof Error) {
        await logErrorToDB({
          apiKey,
          errorType: e.name,
          errorMessage: e.message,
          errorDetails: e.stack,
        });
      } else {
        await logErrorToDB({
          apiKey,
          errorType: "UnknownError",
          errorMessage: "An unknown error occurred",
          errorDetails: JSON.stringify(e),
        });
      }
    } catch (dbError) {
      console.error("Failed to log error to DB:", dbError);
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
