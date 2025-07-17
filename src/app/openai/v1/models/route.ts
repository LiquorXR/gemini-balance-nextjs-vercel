import { proxyRequest } from "@/lib/gemini-proxy";
import logger, { logErrorToDB } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // This route is now just a simple pass-through to the proxy.
    // The proxy will handle fetching, and the adapter will handle formatting.
    // We pass a special prefix to be replaced, specific to this OpenAI-compatible route.
    return await proxyRequest(request, "/openai");
  } catch (e) {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    logger.error({ error: e }, "Error in openai/v1/models route");

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
