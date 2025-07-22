import { chatService } from "@/lib/services/chat.service";
import { withRetryHandling } from "@/lib/utils/withRetryHandling";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { model, stream, ...rest } = body;

    if (stream) {
      const handler = (apiKey: string) =>
        chatService.createStreamCompletion(rest, { model, apiKey });

      const streamResponse = await withRetryHandling(handler, {
        modelName: model,
        requestBody: rest,
      });
      return new Response(streamResponse, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      const handler = (apiKey: string) =>
        chatService.createCompletion(rest, { model, apiKey });

      const chatCompletion = await withRetryHandling(handler, {
        modelName: model,
        requestBody: rest,
      });
      return NextResponse.json(chatCompletion);
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
