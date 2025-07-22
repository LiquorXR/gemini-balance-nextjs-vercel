# 开发方案书：Gemini Balance (Coolify Docker 部署版)

**版本**: 2.3
**日期**: 2025 年 7 月 14 日
**制定人**: Cline，系统架构师

---

### 1. 指导思想

本方案是 `DEVELOPMENT_PLAN_NEXTJS.md` 的一个变体，它根据个人及小团队使用的场景和**新版《项目迁移方案书》中详尽定义的工作流**进行了特别优化，旨在**最大程度地简化架构、降低部署和维护成本**。

核心目标是构建一个**自包含 (self-contained)**、易于部署的 AI 网关。我们将遵循**“够用即可”**的原则，优先选择最简单的技术实现，使其在 **Coolify 平台的单个 Docker 容器**中就能稳定、高效地运行，同时完整对标原始方案的全部核心功能。

---

### 2. 推荐技术栈 (Coolify 版)

- **框架**: Next.js (App Router)
- **UI**: React Server Components (RSC) + shadcn/ui
- **数据库**: **SQLite** (轻量、零配置，适合单机部署)
- **ORM**: Prisma
- **状态与缓存**: **内存** (由 KeyManager 单例直接管理)
- **认证**: 基于 `iron-session` 的自定义会话管理
- **定时任务**: **`node-cron`** (在应用进程内运行)
- **部署**: **Docker**

---

### 3. 建议项目结构 (Coolify 版)

```
/
├── prisma/
│   └── schema.prisma
├── public/
├── src/
│   ├── app/
│   │   └── ... (与原方案相同)
│   ├── components/
│   │   └── ... (与原方案相同)
│   ├── lib/
│   │   ├── ... (与原方案相同)
│   │   └── services/
│   │       ├── key-manager.ts    # 核心密钥管理 (需调整)
│   │       └── openai-adapter.ts # (与原方案相同)
│   └── middleware.ts             # (与原方案相同)
├── Dockerfile                  # 新增：用于构建生产镜像
├── .dockerignore               # 新增
├── server.js                   # 新增：自定义 Node.js 服务器
├── .env.example
└── package.json
```

---

### 4. 核心功能实现方案 (Coolify 版)

#### 4.1. 状态管理与持久化 (对标方案第 7 节)

本节直接对标《项目迁移方案书》第 7 节，阐述如何在单实例 Docker 环境下实现一个功能对等且极致简单的状态管理模型。

- **内存状态 (In-Memory State)**:

  - **原始方案**: 使用 Python 单例服务 (`KeyManager`) 在**应用内存**中管理密钥的动态状态。
  - **Next.js 对标**: **完全一致的实现**。由于我们采用的是长时间运行的 Docker 容器（单实例），可以直接在 `KeyManager` 单例服务 (`src/lib/services/key-manager.ts`) 中管理密钥状态和失败计数。这是此场景下最高效、最简单的模式。

- **数据库持久化 (Database Persistence)**:

  - **原始方案**: 使用 `SQLAlchemy` 将**请求日志、错误日志、应用配置**存入 `MySQL/SQLite`。
  - **Next.js 对标**: **逻辑完全一致**。我们将使用 **Prisma ORM** (`src/lib/db.ts`) 操作 **SQLite** 数据库，持久化完全相同的数据。

- **数据清理 (Data Cleanup)**:
  - **原始方案**: 使用 `APScheduler` 在应用进程内执行定时任务。
  - **Next.js 对标**: **功能完全对标**。我们将使用 `node-cron` 库在 `server.js` 中启动一个定时任务，实现日志的自动清理。

#### 4.2. 可视化管理与监控 (对标方案 4.3 节)

本节精准对标《项目迁移方案书》4.3 节中定义的 Web UI 工作流，并将其转化为 Next.js 的实现。

- **实现路径**: `src/app/(admin)/*`
- **工作流映射**:
  - **数据获取 (如 `GET /keys`)**:
    - **原始方案**: 后端路由函数调用服务，获取数据，然后渲染 HTML 模板。
    - **Next.js 对标**: `src/app/(admin)/keys/page.tsx` 将是一个 **React Server Component (RSC)**。它在服务端直接 `await keyManager.getAllKeys()`，并将获取的数据作为 props 传递给客户端组件进行渲染。
  - **用户操作 (如 `POST /verify-selected-keys`)**:
    - **原始方案**: 前端 JS 通过 `fetch` 调用一个独立的后端管理 API。
    - **Next.js 对标**: 我们将此模式升级为 **Server Actions**。页面上的“验证密钥”按钮将直接调用一个定义在 `src/app/(admin)/actions.ts` 中的异步函数 `verifySelectedKeys(keyIds)`。这个函数在服务端执行，直接调用 `KeyManager` 的方法，并返回结果。
    - **核心优势**: **Server Actions 统一了前后端逻辑**，无需再为内部管理功能定义和维护一套独立的 RESTful API，代码更简洁、类型更安全。
  - **配置热加载 (如 `POST /api/config/save`)**:
    - **原始方案**: 前端将配置 POST 到 API，后端服务更新数据库并热加载。
    - **Next.js 对标**: 完全一致的逻辑，但通过 Server Action 实现。管理员在 `/config` 页面点击保存，会调用 `saveConfig(newConfig)` 这个 Server Action，它负责更新数据库中的 `Settings` 表。由于 `KeyManager` 等服务在需要时会重新从数据库读取配置，因此**同样实现了配置的热加载，无需重启应用**。

#### 4.3. 部署准备 (Dockerfile & Custom Server)

为了让 Next.js 应用能在 Docker 中高效运行，需要进行以下准备：

1.  **SQLite 数据库持久化**:
    SQLite 将数据存储在单个文件中。在 Docker 环境中，容器的文件系统是临时的，当容器被删除或重建时，数据会丢失。为了解决这个问题，我们必须使用 **Docker 数据卷 (Volume)**。

    - **在 `docker-compose.yml` (推荐) 或 `docker run` 命令中**，将一个外部路径映射到容器内 `prisma/dev.db` 文件所在的位置。
    - **示例 (`docker-compose.yml`)**:
      ```yaml
      services:
        gemini-balance:
          # ... other configs
          volumes:
            - ./data:/app/prisma
      ```
      这会将主机当前目录下的 `data` 文件夹映射到容器的 `/app/prisma` 目录，从而将 `dev.db` 文件持久化到主机上。

2.  **开启 Standalone 输出模式**:
    在 `next.config.js` 中配置 `output: 'standalone'`。这会让 `next build` 命令生成一个独立的 `.next/standalone` 目录，其中包含了运行应用所需的最少文件，极大地减小了 Docker 镜像的体积。

3.  **创建 `Dockerfile`**:
    一个典型的多阶段 `Dockerfile` 如下：

    ```dockerfile
    # 1. 安装依赖阶段
    FROM node:20-alpine AS deps
    WORKDIR /app
    COPY package.json pnpm-lock.yaml ./
    RUN npm i -g pnpm && pnpm install --frozen-lockfile

    # 2. 构建阶段
    FROM node:20-alpine AS builder
    WORKDIR /app
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    # 从 .env.production 读取环境变量用于构建
    RUN --mount=type=secret,id=dotenv,target=/app/.env.production \
        npm i -g pnpm && pnpm build

    # 3. 运行阶段
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production

    COPY --from=builder /app/public ./public
    COPY --from=builder /app/.next/standalone ./
    COPY --from=builder /app/.next/static ./.next/static

    # 如果使用自定义服务器，则需要 server.js
    # COPY --from=builder /app/server.js ./

    EXPOSE 3000
    CMD ["node", "server.js"]
    ```

4.  **创建自定义 `server.js` (如果需要精细控制)**
    虽然 `standalone` 模式可以不依赖自定义服务器，但为了集成 `node-cron` 等启动任务，推荐使用。

    ```javascript
    // server.js
    const { createServer } = require("http");
    const { parse } = require("url");
    const next = require("next");
    const cron = require("node-cron");

    const dev = process.env.NODE_ENV !== "production";
    const app = next({ dev });
    const handle = app.getRequestHandler();

    app.prepare().then(() => {
      // 在这里初始化你的服务，例如 KeyManager 单例
      // const keyManager = await getKeyManager();

      // 设置定时任务
      cron.schedule("0 * * * *", () => {
        console.log("Running hourly check for API keys...");
        // keyManager.checkAndReactivateKeys();
      });

      createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      }).listen(3000, (err) => {
        if (err) throw err;
        console.log("> Ready on http://localhost:3000");
      });
    });
    ```

---

### 5. 总结

此修订版开发方案，旨在为个人和小型团队提供一个**极致简化、易于部署和维护**的 AI 网关解决方案。

通过采用 **SQLite**、**内存状态管理** 和 **内置 `node-cron` 定时任务**，我们将所有核心功能都封装在一个独立的 Docker 容器中，实现了真正的“自包含”应用。这使得任何具备基础 Docker 知识的用户，都可以通过一个简单的 `docker-compose.yml` 文件和一份 `.env` 配置文件，轻松地将本项目部署在自己的服务器上，无需配置任何额外的外部服务（如 Redis），极大地降低了入门门槛，非常符合开源项目的推广和使用习惯。
