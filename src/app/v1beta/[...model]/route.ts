import { isAuthenticated } from "@/lib/auth";
import { proxyRequest } from "@/lib/gemini-proxy";
import logger, { logErrorToDB } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authError = await isAuthenticated(request);
    if (authError) {
      return authError;
    }
    // This will proxy requests from /v1beta/... to the Google API's /v1beta/...
    return await proxyRequest(request, "");
  } catch (e: unknown) {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    logger.error({ error: e }, "Error in v1beta/[...model] route");

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
