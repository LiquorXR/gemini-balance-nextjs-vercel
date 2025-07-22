"use server";

import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

export async function getSettings() {
  try {
    const allSettings = await db.query.settings.findMany();
    // Convert array to a key-value object for easier consumption by the form
    const settingsObject = allSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);
    return { success: true, settings: settingsObject };
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return {
      success: false,
      settings: {},
      error: "Failed to fetch settings.",
    };
  }
}

export async function updateSettings(
  prevState: { success: boolean; message: string },
  formData: FormData
) {
  try {
    const updates: { key: string; value: string }[] = [];
    for (const [key, value] of formData.entries()) {
      updates.push({ key, value: value as string });
    }

    // Use a transaction to ensure all settings are updated or none are
    await db.transaction(async (tx) => {
      for (const setting of updates) {
        await tx
          .insert(settings)
          .values(setting)
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: setting.value },
          });
      }
    });

    revalidatePath("/settings");
    return { success: true, message: "Settings updated successfully." };
  } catch (error) {
    console.error("Failed to update settings:", error);
    return { success: false, message: "Failed to update settings." };
  }
}
