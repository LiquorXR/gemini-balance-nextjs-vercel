import { chatService } from "@/lib/services/chat.service";
import { withRetryHandling } from "@/lib/utils/withRetryHandling";
import { NextResponse } from "next/server";

export const runtime = "edge";

async function handler() {
  try {
    const execute = (apiKey: string) => chatService.getBaseModels(apiKey);
    const models = await withRetryHandling(execute);

    return NextResponse.json({ models });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("[Gemini Models API Error]", error);
    return NextResponse.json(
      {
        error: {
          message: errorMessage,
          type: "server_error",
        },
      },
      { status: 500 }
    );
  }
}

export { handler as GET };
