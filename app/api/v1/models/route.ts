import { configService } from "@/lib/config";
import { chatService } from "@/lib/services/chat.service";
import { withRetryHandling } from "@/lib/utils/withRetryHandling";
import { NextResponse } from "next/server";

// Helper to deep copy an object
const deepCopy = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export async function GET() {
  try {
    const handler = (apiKey: string) => chatService.getBaseModels(apiKey);
    const baseModels = await withRetryHandling(handler);

    const searchModelsConfig = (await configService.get("SEARCH_MODELS")) || [];
    const imageModelsConfig = (await configService.get("IMAGE_MODELS")) || [];

    const derivedModels = [];

    for (const modelName of searchModelsConfig) {
      const baseModel = baseModels.find((m) => m.name.includes(modelName));
      if (baseModel) {
        const derivedModel = deepCopy(baseModel);
        derivedModel.name = `${modelName}-search`;
        derivedModel.displayName = `${baseModel.displayName} (Search)`;
        derivedModels.push(derivedModel);
      }
    }

    for (const modelName of imageModelsConfig) {
      const baseModel = baseModels.find((m) => m.name.includes(modelName));
      if (baseModel) {
        const derivedModel = deepCopy(baseModel);
        derivedModel.name = `${modelName}-image`;
        derivedModel.displayName = `${baseModel.displayName} (Image)`;
        derivedModels.push(derivedModel);
      }
    }

    const allModels = [...baseModels, ...derivedModels].map((model) => ({
      id: model.name.split("/").pop(),
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "google",
    }));

    return NextResponse.json({
      object: "list",
      data: allModels,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
