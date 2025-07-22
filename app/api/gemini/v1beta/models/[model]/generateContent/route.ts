import { chatService } from "@/lib/services/chat.service";
import { withRetryHandling } from "@/lib/utils/withRetryHandling";
import { NextResponse } from "next/server";

export const runtime = "edge";

async function handler(
  req: Request,
  { params }: { params: Promise<{ model: string }> }
) {
  try {
    const requestBody = await req.json();
    const { model } = await params;

    const execute = (apiKey: string) =>
      chatService.createNativeCompletion(requestBody, { model, apiKey });

    const response = await withRetryHandling(execute);
    return NextResponse.json(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("[Gemini GenerateContent API Error]", error);
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

export { handler as POST };
