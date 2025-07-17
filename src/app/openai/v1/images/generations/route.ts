import { isAuthenticated } from "@/lib/auth";
import { callImagenApi } from "@/lib/imagen-client";
import logger, { logErrorToDB } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authError = await isAuthenticated(request);
    if (authError) {
      return authError;
    }

    const body = await request.json();
    const { prompt, n = 1, size = "1024x1024", response_format = "url" } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }

    const imageResponse = await callImagenApi({
      prompt,
      n,
      size,
      response_format,
    });

    return NextResponse.json(imageResponse);
  } catch (e) {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    logger.error({ error: e }, "Error in openai/v1/images/generations route");

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
