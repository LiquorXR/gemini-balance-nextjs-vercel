import { isAuthenticated } from "@/lib/auth";
import {
  createReadableStream,
  getRequestBody,
  getRequestHeaders,
} from "@/lib/gemini-proxy";
import logger, { logErrorToDB } from "@/lib/logger";
import { getSettings } from "@/lib/settings";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authError = await isAuthenticated(request);
    if (authError) {
      return authError;
    }

    const { PROXY_URL } = await getSettings();

    if (!PROXY_URL) {
      return NextResponse.json(
        {
          error:
            "Upstream proxy URL is not configured. Please set PROXY_URL in the settings.",
        },
        { status: 500 }
      );
    }

    const headers = getRequestHeaders(request);
    const body = await getRequestBody(request);

    const response = await fetch(`${PROXY_URL}/embeddings`, {
      method: "POST",
      headers,
      body,
    });

    if (response.body) {
      const stream = createReadableStream(response.body);
      return new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } else {
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  } catch (e: any) {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    logger.error({ error: e }, "Error in openai/v1/embeddings route");

    try {
      await logErrorToDB({
        apiKey,
        errorType: e.name || "ApiError",
        errorMessage: e.message,
        errorDetails: e.stack || JSON.stringify(e),
      });
    } catch (dbError) {
      console.error("Failed to log error to DB:", dbError);
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
