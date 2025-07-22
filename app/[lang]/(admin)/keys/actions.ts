"use server";

import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getKeys() {
  try {
    const keys = await db.query.apiKeys.findMany();
    return { success: true, keys };
  } catch (error) {
    console.error("Failed to fetch keys:", error);
    return { success: false, keys: [], error: "Failed to fetch keys." };
  }
}

export async function deleteKeys(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { success: false, message: "No keys selected." };
  }

  try {
    await db.delete(apiKeys).where(inArray(apiKeys.key, ids));
    revalidatePath("/keys"); // Revalidate the keys page to show the updated list
    return { success: true, message: "Keys deleted successfully." };
  } catch (error) {
    console.error("Failed to delete keys:", error);
    return { success: false, message: "Failed to delete keys." };
  }
}
