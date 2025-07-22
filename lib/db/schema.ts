import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// 存储所有配置项，如 auth_token, max_failures 等
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// 存储 API 密钥及其状态
export const apiKeys = pgTable("api_keys", {
  key: text("key").primaryKey(),
  failureCount: integer("failure_count").default(0).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
});

// 请求日志
export const requestLogs = pgTable("request_logs", {
  id: serial("id").primaryKey(),
  apiKey: text("api_key").notNull(),
  modelName: text("model_name"),
  isSuccess: boolean("is_success").default(true).notNull(),
  statusCode: integer("status_code"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").notNull(),
});

export type RequestLog = InferSelectModel<typeof requestLogs>;
export type InsertRequestLog = InferInsertModel<typeof requestLogs>;

// 错误日志
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  apiKey: text("api_key"),
  modelName: text("model_name"),
  errorCode: integer("error_code"),
  errorMessage: text("error_message"),
  requestBody: text("request_body"), // 存储 JSON 字符串
  createdAt: timestamp("created_at").notNull(),
});

export type ErrorLog = InferSelectModel<typeof errorLogs>;
export type InsertErrorLog = InferInsertModel<typeof errorLogs>;
