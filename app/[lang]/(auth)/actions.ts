"use server";

import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type FormState = {
  success: boolean;
  message: string;
};

export async function createLoginAction(
  lang: "en" | "zh",
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const token = formData.get("token") as string;

  if (!token || typeof token !== "string" || token.trim() === "") {
    return { success: false, message: "error_token_empty" };
  }

  try {
    const authTokenSetting = await db.query.settings.findFirst({
      where: eq(settings.key, "AUTH_TOKEN"),
    });

    // Scenario 1: System is not initialized
    if (!authTokenSetting) {
      await db.insert(settings).values({ key: "AUTH_TOKEN", value: token });
    }
    // Scenario 2: System is initialized, check password
    else {
      if (token !== authTokenSetting.value) {
        return { success: false, message: "error_token_invalid" };
      }
    }

    // If we reach here, the token is valid (or has just been set)
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });
  } catch (error) {
    console.error("Auth Action Error:", error);
    return { success: false, message: "error_server_internal" };
  }

  redirect(`/${lang}/dashboard`);
}
