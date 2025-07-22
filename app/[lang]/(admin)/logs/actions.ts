"use server";

import { db } from "@/lib/db";
import { errorLogs, requestLogs } from "@/lib/db/schema";
import { and, asc, count, desc, gte, like, lte, sql } from "drizzle-orm";

// Define a type for the query parameters for better type safety
type GetLogsParams = {
  logType?: "request_logs" | "error_logs";
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: {
    apiKey?: string;
    modelName?: string;
    statusCode?: number;
    dateRange?: {
      from?: Date;
      to?: Date;
    };
  };
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 15;

export async function getLogs(params: GetLogsParams = {}) {
  const {
    logType = "request_logs",
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    sortBy = "createdAt",
    sortOrder = "desc",
    filters = {},
  } = params;

  const offset = (page - 1) * limit;
  const table = logType === "error_logs" ? errorLogs : requestLogs;

  // Build the where clause dynamically based on filters
  const whereConditions = [];
  if (filters.apiKey) {
    whereConditions.push(like(table.apiKey, `%${filters.apiKey}%`));
  }
  if (filters.modelName) {
    whereConditions.push(like(table.modelName, `%${filters.modelName}%`));
  }
  if (filters.dateRange?.from) {
    whereConditions.push(gte(table.createdAt, filters.dateRange.from));
  }
  if (filters.dateRange?.to) {
    whereConditions.push(lte(table.createdAt, filters.dateRange.to));
  }

  // Add log-type-specific filters
  if (logType === "request_logs" && filters.statusCode) {
    whereConditions.push(
      sql`${requestLogs.statusCode} = ${filters.statusCode}`
    );
  }

  const whereClause = and(...whereConditions);

  // Define allowed sortable columns for type safety
  const allowedSortBy = ["modelName", "createdAt", "statusCode", "latencyMs"];

  try {
    // Base query for fetching data
    const query = db
      .select()
      .from(table)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    // Base query for counting total records
    const totalQuery = db
      .select({ value: count() })
      .from(table)
      .where(whereClause);

    // Apply sorting
    const orderFunction = sortOrder === "asc" ? asc : desc;
    const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : "createdAt";

    let finalQuery;

    switch (safeSortBy) {
      case "modelName":
        finalQuery = query.orderBy(orderFunction(table.modelName));
        break;
      case "createdAt":
        finalQuery = query.orderBy(orderFunction(table.createdAt));
        break;
      case "statusCode":
        if (logType === "request_logs") {
          finalQuery = query.orderBy(orderFunction(requestLogs.statusCode));
        } else {
          finalQuery = query;
        }
        break;
      case "latencyMs":
        if (logType === "request_logs") {
          finalQuery = query.orderBy(orderFunction(requestLogs.latencyMs));
        } else {
          finalQuery = query;
        }
        break;
      default:
        finalQuery = query.orderBy(desc(table.createdAt));
        break;
    }

    // Execute both queries in parallel
    const [data, totalResult] = await Promise.all([finalQuery, totalQuery]);

    const total = totalResult?.[0].value ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error(`[LOGS_ACTION] Failed to fetch ${logType}:`, error);
    return {
      success: false,
      error: "Internal Server Error",
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }
}
