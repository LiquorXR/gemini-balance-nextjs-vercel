# Gemini Balance Next.js 迁移工作清单

本文档根据《Project_Migration_Proposal_NextJS_v2_ZH.md》迁移方案书制定，用于跟踪迁移工作的开发进度。

## P0: 基础架构搭建 (Foundation Setup)

- [x] **任务 0.1**: 初始化 Drizzle ORM，并创建数据库 Schema (`lib/db/schema.ts`)。
- [x] **任务 0.2**: 配置 `next.config.js`，添加 API 路由重写规则。
- [x] **任务 0.3**: 搭建核心服务层骨架 (`lib/services/key.service.ts`, `lib/services/chat.service.ts`)。
- [x] **任务 0.4**: 实现基础的配置服务，能够从数据库中读取配置。

## P1: 核心代理功能 (Core Proxy Functionality)

- [x] **任务 1.1**: 实现 `key.service.ts` 中的密钥管理逻辑 (LRU 轮询, 故障处理)。
- [x] **任务 1.2**: 实现 `chat.service.ts` 中的 OpenAI-to-Gemini **请求转换**逻辑。
- [x] **任务 1.3**: 实现 `chat.service.ts` 中的 Gemini-to-OpenAI **非流式响应**转换逻辑。
- [x] **任务 1.4**: 实现 OpenAI 兼容的**非流式**聊天 API 路由 (`/api/v1/chat/completions/route.ts`)。
- [x] **任务 1.5**: 实现故障转移与重试的高阶函数 `withRetryHandling`。

## P2: 流式响应与高级功能 (Streaming & Advanced Features)

- [x] **任务 2.1**: 实现 `chat.service.ts` 中的 Gemini-to-OpenAI **流式响应**转换逻辑。
- [x] **任务 2.2**: 实现 OpenAI 兼容的**流式**聊天 API 路由。
- [x] **任务 2.3**: 实现动态衍生模型功能 (`/api/v1/models/route.ts`)。
- [x] **任务 2.4**: 实现其余 OpenAI 兼容 API 路由 (`embeddings`, `images/generations`, `audio/speech`)。
- [x] **任务 2.5**: 实现所有 Gemini 原生 API 路由。

## P3: 管理后台 (Admin Dashboard)

- [x] **任务 3.1**: 实现认证与首次启动设置流程 (`/login`, `/setup`)。
- [x] **任务 3.2**: 实现后台路由的 `middleware.ts` 鉴权。
- [x] **任务 3.3**: (UI) 搭建管理后台的整体布局 (`(admin)/layout.tsx`)。
- [x] **任务 3.4**: (UI) 实现密钥管理页面 (`/keys`)，包括展示、过滤和批量操作。
- [x] **任务 3.5**: (API) 实现密钥管理的内部 API (`/api/admin/keys/...`)。
- [x] **任务 3.6**: (UI) 实现配置管理页面 (`/settings`)。
- [x] **任务 3.7**: (API) 实现配置管理的内部 API (`/api/admin/settings`)。
- [x] **任务 3.8**: (UI) 实现仪表盘页面 (`/dashboard`)。
- [x] **任务 3.9**: (UI) 实现日志查看器页面 (`/logs`)。
- [x] **任务 3.10**: (API) 实现日志查询的内部 API (`/api/admin/logs/...`)。

## P4: 部署与收尾 (Deployment & Finalization)

- [x] **任务 4.1**: 实现数据库日志记录 (`request_logs`, `error_logs`)。
- [x] **任务 4.2**: 实现 Serverless 定时任务 (密钥自动恢复)。
- [x] **任务 4.3**: 编写 `README.md`，提供详细的部署和使用指南（包括 Cloudflare 和自托管两种路径）。
- [x] **任务 4.4**: 准备 Dockerfile 和 `docker-compose.yml` 以支持自托管部署。
- [x] **任务 4.5**: 进行全面的端到端测试。
