"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ErrorLog, RequestLog } from "@/lib/db/schema";
import { format } from "date-fns";
import { useEffect, useState, useTransition } from "react";
import { getLogs } from "./actions";

type LogData = {
  data: (RequestLog | ErrorLog)[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function LogsPage() {
  const [, startTransition] = useTransition();
  const [logType, setLogType] = useState<"request_logs" | "error_logs">(
    "request_logs"
  );
  const [logs, setLogs] = useState<LogData | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchLogs = () => {
      startTransition(async () => {
        const result = await getLogs({ logType, page });
        if (result.success) {
          setLogs(result as LogData);
        }
      });
    };
    fetchLogs();
  }, [logType, page, startTransition]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">日志查看器</h2>
      </div>
      <div className="flex items-center space-x-2">
        <Select
          value={logType}
          onValueChange={(v: "request_logs" | "error_logs") => setLogType(v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择日志类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="request_logs">请求日志</SelectItem>
            <SelectItem value="error_logs">错误日志</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="按模型名称搜索..." className="max-w-sm" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {logType === "request_logs" ? (
                <>
                  <TableHead>模型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>延迟</TableHead>
                  <TableHead>创建时间</TableHead>
                </>
              ) : (
                <>
                  <TableHead>模型</TableHead>
                  <TableHead>错误信息</TableHead>
                  <TableHead>创建时间</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.data.map((log) => (
              <TableRow key={log.id}>
                {logType === "request_logs" ? (
                  <>
                    <TableCell>{(log as RequestLog).modelName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (log as RequestLog).isSuccess
                            ? "default"
                            : "destructive"
                        }
                      >
                        {(log as RequestLog).statusCode}
                      </Badge>
                    </TableCell>
                    <TableCell>{(log as RequestLog).latencyMs}ms</TableCell>
                    <TableCell>
                      {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{(log as ErrorLog).modelName}</TableCell>
                    <TableCell className="truncate max-w-xs">
                      {(log as ErrorLog).errorMessage}
                    </TableCell>
                    <TableCell>
                      {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={page >= (logs?.pagination.totalPages ?? 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
