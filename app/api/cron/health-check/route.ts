import { keyService } from "@/lib/services/key.service";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    const result = await keyService.recoverDisabledKeys();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("[CRON_HEALTH_CHECK_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
