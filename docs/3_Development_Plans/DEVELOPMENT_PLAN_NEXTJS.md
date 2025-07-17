# 开发方案书：Gemini Balance (Next.js 最佳实践版)

**版本**: 3.0
**日期**: 2025 年 7 月 14 日
**制定人**: Cline，系统分析师

---

### 1. 指导思想

本方案根据 **更新后的项目迁移方案书** 进行修订，旨在将 `Gemini Balance` 的核心功能，以 **Next.js 最佳实践**为标准进行全新实现。新版方案书提供了更详细的内部工作流，本开发计划将确保所有细节在 Next.js 架构下得到精确映射和优化。

我们将深度整合 Next.js App Router、Server Actions、Middleware 等核心特性，并充分利用 Vercel 平台的 Serverless 优势（如 Cron Jobs, KV Storage），打造一个企业级的解决方案。

---

### 2. 推荐技术栈

- **框架**: Next.js (App Router)
- **UI**: React Server Components (RSC) + shadcn/ui (推荐，用于快速构建高质量的管理界面)
- **数据库**: PostgreSQL (推荐) 或 MySQL
- **ORM**: Prisma
- **状态与缓存**: Vercel KV (基于 Redis，用于高性能的密钥轮询和状态管理)
- **认证**: 基于 `iron-session` 的自定义会话管理 (轻量且安全)
- **部署**: Vercel

---

### 3. 建议项目结构

```
/
├── prisma/
│   └── schema.prisma         # 数据库模型定义
├── public/
│   └── ...
├── src/
│   ├── app/
│   │   ├── (admin)/            # 管理后台路由组 (需认证)
│   │   │   ├── admin/(...)       # 后台页面
│   │   │   ├── layout.tsx
│   │   │   └── actions.ts        # 管理后台专用的 Server Actions
│   │   ├── (auth)/             # 认证路由组
│   │   │   └── login/page.tsx
│   │   ├── v1/                   # OpenAI 兼容 API
│   │   │   ├── chat/completions/route.ts
│   │   │   ├── embeddings/route.ts
│   │   │   ├── images/generations/route.ts
│   │   │   ├── audio/speech/route.ts
│   │   │   └── models/route.ts
│   │   ├── v1beta/               # 原生 Gemini API
│   │   │   └── models/[...model]/route.ts
│   │   ├── api/                  # 内部 API (如 Cron Jobs)
│   │   │   ├── cron/
│   │   │   │   ├── check-keys/route.ts
│   │   │   │   └── cleanup-logs/route.ts
│   │   │   └── health/route.ts
│   │   ├── layout.tsx            # 根布局
│   │   └── page.tsx              # 根页面 (可作为登录页或项目介绍)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui 基础组件
│   │   └── admin/                # 管理后台专用业务组件
│   ├── lib/
│   │   ├── auth.ts               # 认证逻辑与会话管理
│   │   ├── config.ts             # 应用配置服务 (读写数据库)
│   │   ├── db.ts                 # Prisma 客户端实例
│   │   ├── kv.ts                 # Vercel KV 客户端实例
│   │   ├── logger.ts             # 日志服务
│   │   └── services/
│   │       ├── key-manager.ts    # 核心密钥管理与负载均衡服务
│   │       └── openai-adapter.ts # OpenAI <=> Gemini 协议适配器
│   └── middleware.ts             # 路由中间件 (用于后台认证)
├── .env.example
└── package.json
```

---

### 4. 核心功能实现方案 (最佳实践版)

#### 4.1 API 代理与负载均衡

这是对性能要求最高的部分，我们将采用 **DB + KV 混合模式**。

- **核心服务**: `src/lib/services/key-manager.ts`
- **实现机制**:
  1.  **状态存储**:
      - **主数据库 (PostgreSQL/Prisma)**: 作为 API 密钥的唯一真实来源 (Source of Truth)，存储密钥值、元数据、总使用次数等持久化信息。
      - **Vercel KV (Redis)**: 作为高性能的**运行时状态存储**。存储以下信息：
        - 一个 `active_keys` 列表，存放当前所有健康密钥的 ID。
        - 一个 `key_failure_counts` 哈希表，记录每个密钥的连续失败次数。
        - 一个 `round_robin_index` 计数器，用于实现高效轮询。
  2.  **密钥获取 `getNextKey()`**:
      - API 路由每次调用此方法时，它会直接与 Vercel KV 交互。
      - 使用 `INCR` 命令原子性地增加 `round_robin_index`，然后通过 `LINDEX` 从 `active_keys` 列表中获取对应索引的密钥 ID。整个过程极快，避免了对主数据库的查询。
      - 根据获取的 ID 从数据库或缓存中拿到密钥的完整值。
  3.  **失败处理 `handleKeyFailure(keyId)`**:
      - 当请求失败时，在 KV 中使用 `HINCRBY` 原子性地增加 `key_failure_counts` 中对应密钥的失败计数。
      - 如果失败次数达到阈值，则从 `active_keys` 列表中移除该密钥 ID，并将其 ID 添加到 `inactive_keys` 列表中。此操作同样在 KV 中完成，响应迅速。
  4.  **健康检查 (Cron Job)**:
      - `src/app/api/cron/check-keys/route.ts` 定时任务会从 KV 的 `inactive_keys` 列表中读取所有失效密钥。
      - 对这些密钥进行健康检查。如果成功，则将其从 `inactive_keys` 移回 `active_keys`，并在 KV 和主数据库中重置其失败计数。
      - 同时，该任务也会定期从主数据库同步密钥列表到 KV，以处理手动添加或删除的密钥。

#### 4.2 双协议兼容 (OpenAI & Gemini)

- **实现路径**: `src/lib/services/openai-adapter.ts`
- **开发要点**:
  - 设计为纯函数模块，接收一种格式的请求/响应，返回另一种格式。
  - `convertOpenAIRequestToGemini`: 精确处理 `system` prompt, `messages` 角色映射, `tools` 到 `functionDeclarations` 的转换。
  - `streamGeminiToOpenAI`: 使用 `ReadableStream` 和 `TransformStream` API 实现高效、低延迟的流式转换，将 Gemini 的 SSE 流实时转换为 OpenAI 格式的 SSE 流。

#### 4.3 可视化管理与监控 (工作流对标)

- **实现路径**: `src/app/(admin)/*`
- **开发要点**:
  - **认证**: `src/middleware.ts` 拦截所有进入 `(admin)` 路由组的请求，验证 `iron-session` cookie。如果未认证，则重定向到 `/login`。此机制对标原始方案的 `AUTH_TOKEN` 认证入口。
  - **数据获取与渲染**:
    - 管理页面（如密钥仪表盘）将作为 **React Server Components (RSC)**。它们在服务端直接调用 `key-manager.ts` 或 `logger.ts` 等服务，获取最新数据（从 Vercel KV 和数据库）。
    - 获取到的数据直接作为 props 传递给客户端组件进行渲染。这对标了原始方案中后端路由函数准备数据并传递给模板的过程，但更为高效和现代化。
  - **用户操作与反馈 (Server Actions)**:
    - 原始方案中，前端 JS 通过 `fetch` 调用后端的管理 API (如 `/verify-selected-keys`)。
    - 在 Next.js 中，我们将此模式升级为 **Server Actions**。页面上的按钮（如“验证密钥”、“重置计数”）将直接绑定定义在 `src/app/(admin)/actions.ts` 中的异步函数。
    - 这些 Action 函数在服务端执行，直接操作 KV 和数据库，然后可以返回结果给前端。前端通过 `useFormState` 和 `useFormStatus` 等 Hooks 来处理加载状态和显示反馈信息（如 Toast 通知）。
    - **这种方式统一了前后端逻辑，无需再定义和维护一套独立的内部管理 API，代码更简洁、类型更安全。**
  - **配置热加载**:
    - `Config` 页面通过 Server Action 直接更新数据库中的 `Settings` 表。
    - `src/lib/config.ts` 服务在每次需要时都会从数据库读取最新配置。
    - **这完全对标并实现了原始方案中描述的配置热加载功能，无需重启应用。**

#### 4.4 数据库与日志

- **Schema**: `prisma/schema.prisma` 中定义 `ApiKey`, `Setting`, `RequestLog`, `ErrorLog` 等模型。
- **日志记录**: `src/lib/logger.ts` 提供 `logRequest` 等异步函数。API 路由在处理完请求后，`await` 或 `(no await)` 调用此函数将日志写入数据库。对于高性能场景，可以考虑先将日志写入 Vercel Log Drains 或一个专门的队列服务，再批量入库，以降低 API 响应延迟。

#### 4.5 路由与 API 端点对齐

为确保与原始迁移方案的 API 端点完全兼容，我们将采取以下策略：

- **直接文件路径路由**: 如上方的项目结构所示，我们将直接在 `src/app` 目录下创建 `v1` 和 `v1beta` 文件夹，以实现 `domain.com/v1/...` 的路由结构，避免了不必要的 `/api` 前缀。
- **Gemini 动态路由**: `v1beta/models/[...model]/route.ts` 将捕获所有 `v1beta/models/` 下的路径。在 `route.ts` 文件内部，我们将通过检查请求的 `pathname` 来区分 `:generateContent` 和 `:streamGenerateContent` 动作。
- **管理类 API**: 原始方案中的 `/reset-selected-fail-counts` 等管理 API，在新方案中将由 **Server Actions** (`src/app/(admin)/actions.ts`) 提供服务。这种方式与 UI 结合更紧密，更安全，是 Next.js 的推荐实践，功能上完全对等。
- **别名路径 (Alias)**: 原始方案中提到的 `/hf/v1/...` 和 `/gemini/v1beta/...` 别名，将通过在 `next.config.mjs` 文件中配置 `rewrites` 规则来实现，无需重复代码。示例如下：

  ```javascript
  // next.config.mjs
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    async rewrites() {
      return [
        {
          source: "/hf/v1/:path*",
          destination: "/v1/:path*",
        },
        {
          source: "/gemini/v1beta/:path*",
          destination: "/v1beta/:path*",
        },
      ];
    },
  };

  export default nextConfig;
  ```

#### 4.6 状态管理与持久化 (Next.js 范式)

本节直接对标原始方案第 7 节，阐述如何在 Next.js/Serverless 环境下实现一个更健壮的状态管理模型。

- **内存状态 -> Vercel KV**:

  - **原始方案**: 使用 Python 单例服务 (`KeyManager`) 在内存中管理密钥状态和失败计数。这在单个有状态服务器上是可行的。
  - **Next.js 方案**: 在 Serverless 环境下，每次 API 调用都可能是一个独立的实例，没有共享内存。因此，我们使用 **Vercel KV (Redis)** 作为“分布式内存”。
  - **对标实现**: `KeyManager` 服务 (`src/lib/services/key-manager.ts`) 的所有状态操作（获取下一个 key、增加失败计数、移入/移出活跃列表）都将通过 `src/lib/kv.ts` 对 Vercel KV 进行原子操作。这不仅实现了原始方案的**极速响应**，还保证了在分布式环境下的**状态一致性**。

- **数据库持久化**:

  - **原始方案**: 使用 `SQLAlchemy` + `databases` 将日志和配置存入 `MySQL/SQLite`。
  - **Next.js 方案**: 完全一致。我们将使用 **Prisma ORM** (`src/lib/db.ts`) 来操作 `PostgreSQL` 或 `MySQL` 数据库。
  - **对标实现**:
    - `ApiKey`, `Setting`, `RequestLog`, `ErrorLog` 等模型将在 `prisma/schema.prisma` 中定义。
    - `src/lib/logger.ts` 将提供异步服务函数，在 API 请求处理完毕后，将日志数据写入数据库，确保不阻塞主请求。
    - `src/lib/config.ts` 将负责从数据库的 `Settings` 表中读写配置。

- **数据清理**:
  - **原始方案**: 使用 `APScheduler` 定时任务。
  - **Next.js 方案**: 完全对标。我们将创建一个 Cron Job API 路由 (`src/app/api/cron/cleanup-logs/route.ts`)，并使用 Vercel 平台的 **Cron Jobs** 功能来定时调用它，实现日志的自动清理。

---

### 5. 迁移步骤建议

1.  **环境搭建**: 初始化 Next.js 项目，安装 Prisma, shadcn/ui, iron-session 等依赖。配置好 Vercel KV 和 PostgreSQL 数据库。
2.  **模型定义**: 在 `prisma/schema.prisma` 中定义好所有数据模型，并执行首次迁移。
3.  **后端核心服务**: 优先开发 `key-manager.ts` 和 `openai-adapter.ts`，并编写单元测试确保其逻辑正确性。
4.  **API 路由**: 搭建 `chat/completions` 等核心 API 路由，集成核心服务，确保代理和负载均衡功能跑通。
5.  **认证与后台**: 实现登录流程和后台中间件保护。
6.  **管理界面**: 逐一构建密钥管理、配置、日志查看等后台页面和对应的 Server Actions。
7.  **部署与测试**: 部署到 Vercel，配置 Cron Jobs，进行端到端测试。

这个方案提供了一个更现代化、更健壮的实现路径，能够最大限度地发挥 Next.js 和 Vercel 生态的威力。
