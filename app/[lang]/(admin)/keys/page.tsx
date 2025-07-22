import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getKeys } from "./actions";
import { columns } from "./columns";
import { KeysDataTable } from "./data-table";

async function checkAuth(lang: "en" | "zh") {
  const tokenFromCookie = (await cookies()).get("auth_token")?.value;
  if (!tokenFromCookie) redirect(`/${lang}/login`);

  try {
    const tokenFromDb = await db.query.settings.findFirst({
      where: eq(settings.key, "AUTH_TOKEN"),
    });
    if (!tokenFromDb || tokenFromCookie !== tokenFromDb.value) {
      redirect(`/${lang}/login`);
    }
  } catch (error) {
    console.error("Keys Page Auth Error:", error);
    redirect(`/${lang}/login`);
  }
}

type PageProps = {
  params: Promise<{ lang: "en" | "zh" }>;
};

export default async function KeysPage({ params }: PageProps) {
  const { lang } = await params;
  await checkAuth(lang);
  const { keys } = await getKeys();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">API Key Management</h1>
      <KeysDataTable columns={columns} data={keys} />
    </div>
  );
}
