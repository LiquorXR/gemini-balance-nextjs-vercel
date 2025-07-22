import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function checkAuth(lang: "en" | "zh") {
  const tokenFromCookie = (await cookies()).get("auth_token")?.value;

  if (!tokenFromCookie) {
    redirect(`/${lang}/login`);
  }

  try {
    const tokenFromDb = await db.query.settings.findFirst({
      where: eq(settings.key, "AUTH_TOKEN"),
    });

    if (!tokenFromDb || tokenFromCookie !== tokenFromDb.value) {
      redirect(`/${lang}/login`);
    }
  } catch (error) {
    console.error("Dashboard Auth Error:", error);
    redirect(`/${lang}/login`);
  }
}

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ErrorLog, RequestLog } from "@/lib/db/schema";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getKeys } from "../keys/actions";
import { getLogs } from "../logs/actions";

type PageProps = {
  params: Promise<{ lang: "en" | "zh" }>;
};

export default async function DashboardPage({ params }: PageProps) {
  const { lang } = await params;
  await checkAuth(lang);

  const [keyData, requestLogData, errorLogData] = await Promise.all([
    getKeys(),
    getLogs({ logType: "request_logs", limit: 5 }),
    getLogs({ logType: "error_logs", limit: 5 }),
  ]);

  const totalKeys = keyData.keys?.length ?? 0;
  const validKeys =
    keyData.keys?.filter((k) => k.isEnabled && k.failureCount < 10).length ?? 0;
  const invalidKeys = totalKeys - validKeys;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">仪表盘</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总密钥数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKeys}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">有效密钥</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{validKeys}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">无效密钥</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{invalidKeys}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">近期请求数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requestLogData.pagination.total}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>近期请求</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>延迟</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(requestLogData.data as RequestLog[]).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.modelName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={log.isSuccess ? "default" : "destructive"}
                      >
                        {log.statusCode}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.latencyMs}ms</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>近期错误</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模型</TableHead>
                  <TableHead>错误信息</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(errorLogData.data as ErrorLog[]).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.modelName}</TableCell>
                    <TableCell className="truncate max-w-[120px]">
                      {log.errorMessage}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
