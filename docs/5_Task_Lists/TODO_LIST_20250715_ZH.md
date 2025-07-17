# 开发任务清单 (2025-07-15)

本清单基于 `DEVELOPMENT_PLAN_20250715_ZH.md` 进行细化，旨在将开发任务分解为具体、可执行的步骤。请在开始编码前确认此清单。

---

## Phase 1: 安全加固与认证重构 (Security & Auth)

### 任务 1.1: 保护所有 API 端点

- [x] **1.1.1: 创建认证工具模块**

  - [x] 在 `src/lib/` 目录下创建新文件 `auth.ts`。
  - [x] 在 `auth.ts` 中，实现 `getApiKey(request)` 函数，用于从 `Authorization` 头或 `key` 查询参数中提取令牌。
  - [x] 在 `auth.ts` 中，实现核心函数 `isAuthenticated(request)`。
    - [x] 调用 `getApiKey` 获取令牌。
    - [x] 如果令牌不存在，返回 401 错误响应。
    - [x] 使用 `prisma` 客户端查询 `ApiKey` 表，验证令牌是否存在。
    - [x] 如果令牌无效，返回 401 错误响应。
    - [x] 如果数据库查询失败，返回 500 错误响应。
    - [x] 如果令牌有效，返回 `null`。

- [x] **1.1.2: 将认证逻辑应用于 OpenAI 兼容路由**

  - [x] 修改 `src/app/openai/v1/chat/completions/route.ts`：
    - 导入 `isAuthenticated`。
    - 在 `POST` 函数的开头调用 `await isAuthenticated(request)`。
    - 如果返回错误响应，则直接 `return` 该响应。
  - [x] 对 `src/app/openai/v1/embeddings/route.ts` 重复上述操作。
  - [x] 对 `src/app/openai/v1/images/generations/route.ts` 重复上述操作。

- [x] **1.1.3: 将认证逻辑应用于 Gemini 及其他代理路由**
  - [x] 确定所有需要保护的代理路由文件，例如 `src/app/gemini/v1beta/[...model]/route.ts` 等。
  - [x] 在所有相关的 `route.ts` 文件中，重复 **1.1.2** 的集成步骤。

### 任务 1.2: 简化并加固管理后台认证 (哈希方案)

- [x] **1.2.1: 安装并配置哈希库**

  - [x] 运行 `pnpm add bcrypt` 和 `pnpm add -D @types/bcrypt` 安装依赖。

- [x] **1.2.2: 重构服务器端登录操作 (`actions.ts`)**

  - [x] 打开 `src/app/auth/actions.ts`。
  - [x] 导入 `bcrypt`。
  - [x] 修改 `login` 服务器操作：
    - [x] **首次设置**: 当从数据库获取的 `AUTH_TOKEN` 为空时，使用 `bcrypt.hash()` 计算用户提交令牌的哈希值，并将**哈希值**存入数据库。
    - [x] **后续登录**: 当数据库中存在 `AUTH_TOKEN` (哈希值) 时，使用 `bcrypt.compare()` 比较用户提交的明文令牌和数据库中存储的哈希值。
    - [x] **成功处理**: 验证成功后，将**明文令牌**存入 `httpOnly` 的 `auth_token` Cookie 中，并从服务器端 `redirect('/admin')`。
    - [x] **失败处理**: 验证失败时，返回明确的错误信息。
  - [x] 修改 `logout` 操作，确保其能正确删除 Cookie 并重定向到根路径 `/`。

- [x] **1.2.3: 实现中间件进行快速路径检查**

  - [x] 打开 `src/middleware.ts`。
  - [x] 对于访问 `/admin/*` 的请求，只检查 `auth_token` Cookie 是否**存在**。
  - [x] 如果 Cookie 不存在，则立即重定向到登录页 `/`。
  - [x] **不在此处进行令牌内容验证**。

- [x] **1.2.4: 在管理后台根布局进行最终验证**
  - [x] 打开 `src/app/admin/layout.tsx`。
  - [x] 将其转换为 `async` 服务器组件。
  - [x] 在组件内部：
    - [x] 从 `cookies()` 中读取明文的 `auth_token`。
    - [x] 从数据库 `Settings` 表中读取**哈希值**形式的 `AUTH_TOKEN`。
    - [x] 使用 `bcrypt.compare()` 比较明文 Cookie 和数据库哈希值。
    - [x] 如果不匹配或任一值不存在，则调用 `redirect('/')` 将用户踢出。
    - [x] 如果匹配，则正常渲染子组件。

---

## Phase 2: 架构优化与开发者体验 (Architecture & DevEx)

### 任务 2.1: 清理和统一认证逻辑

- [x] **2.1.1: 移除冗余的认证检查**
  - [x] 检查并移除 `src/app/page.tsx` 或其他组件中任何残留的、手动的 Cookie 检查逻辑，因为中间件现在是唯一的保护屏障。
- [x] **2.1.2: 简化页面逻辑**
  - [x] 确保 `src/app/page.tsx` 只负责展示登录表单，不包含任何重定向或认证逻辑。
  - [x] 确保 `src/app/admin/*` 下的页面不再需要各自进行认证检查。

### 任务 2.2: 修复并规范化数据库迁移脚本

- [x] **2.2.1: 修正 `package.json`**
  - [x] 打开 `package.json` 文件。
  - [x] 找到 `"db:migrate"` 脚本。
  - [x] 将其值从 `"tsx scripts/migrate.ts"` 修改为 `"prisma migrate dev"`。
- [x] **2.2.2: 更新文档**
  - [x] 打开 `README.md` 或 `docs/README_ZH.md`。
  - [x] 添加一个新的 "数据库迁移" 章节。
  - [x] 在该章节中，分别说明开发环境 (`pnpm run db:migrate`) 和生产环境 (`pnpm dlx prisma migrate deploy`) 的命令和用途。

### 任务 2.3: 专业的 UI/UX 基础建设

- [x] **2.3.1: 更新应用元数据**
  - [x] 打开 `src/app/layout.tsx`。
  - [x] 修改 `metadata` 对象，设置一个有意义的 `title` 和 `description`。
- [x] **2.3.2: 建立真正的仪表盘首页**
  - [x] 打开 `src/app/admin/page.tsx`。
  - [x] 移除 Next.js 默认的欢迎内容。
  - [x] 设计并实现一个新的仪表盘布局，可以包含一些卡片（Card）组件，用于未来展示关键统计数据。

---

## Phase 3: 核心功能对齐与实现 (Feature Parity)

### 任务 3.1: 完善密钥管理器与健康检查

- [x] **3.1.1: 审查并加固 KeyManager 逻辑**

  - [x] 打开 `src/lib/key-manager.ts`。
  - [x] 仔细审查 `getAvailableKey`、`markAsFailed` 等核心方法，确保负载均衡和失败计数的逻辑正确无误。
  - [x] 确认 `KeyManager` 的单例模式在 Next.js 的热重载环境下是安全的。

- [x] **3.1.2: 实现并验证定时健康检查**

  - [x] 打开 `src/app/api/cron/health-check/route.ts`。
  - [x] 实现该路由的 `GET` 方法。
  - [x] 从 `KeyManager` 获取所有被禁用的密钥列表。
  - [x] 遍历列表，为每个密钥发送一个轻量级的测试 API 请求（例如向 `gemini-1.5-flash` 问好）。
  - [x] 如果测试请求成功，调用 `KeyManager` 的方法（例如 `reactivateKey`）将其从禁用池移回活动池并重置失败计数。
  - [x] 部署或配置一个 Cron Job 服务（如 Vercel Cron）来定期调用此路由。

- [x] **3.1.3: 使健康检查可配置**
  - [x] 在 `src/lib/settings.ts` 中，添加一个新的环境变量 `HEALTH_CHECK_MODEL`，默认值为 `gemini-1.5-flash`。
  - [x] 修改健康检查路由，使用此配置的`HEALTH_CHECK_MODEL`进行测试，而不是硬编码的值。

### 任务 3.2: 实现高级模型功能

- [x] **3.2.1: 实现联网搜索功能**

  - [x] 打开 `src/lib/google-adapter.ts` 或处理请求转换的核心模块。
  - [x] 在转换 OpenAI 请求到 Gemini 请求的逻辑中，增加一个判断：如果模型名称以 `-search` 结尾。
  - [x] 如果条件为真，则在构造 Gemini 请求体时，自动向 `tools` 数组中添加 `{"googleSearch": {}}`。

- [x] **3.2.2: 实现对话式图像生成**

  - [x] 在 `src/app/openai/v1/chat/completions/route.ts` 或相应的代理逻辑中，增加一个判断：如果请求的模型是已知的图像生成模型（例如，名称以 `imagen` 开头）。
  - [x] 如果是，则将请求转发给 `src/lib/imagen-client.ts` 中的特定逻辑处理，而不是标准的 `gemini-proxy`。
  - [ ] （可选）如果需要返回公网 URL，需实现将生成的图片上传到图床的逻辑。

- [x] **3.2.3: 验证 Function Calling 适配**
  - [x] 编写或执行一个测试用例，该用例包含 OpenAI 格式的 `tools` 参数。
  - [x] 调试并确保 `src/lib/google-adapter.ts` 能将其正确转换为 Gemini 支持的 `functionDeclarations` 格式。

### 任务 3.3: 完善管理后台功能

- [x] **3.3.1: 增强密钥状态监控**

  - [x] 打开 `src/app/admin/KeyTable.tsx` 和相关的 `actions.ts`。
  - [x] 确保表格能从后端正确获取并展示所有密钥的状态（有效/无效）、失败次数、上次失败时间等。
  - [x] 为每一行添加 "手动验证" 和 "重置失败计数" 的按钮。
  - [x] 实现这两个按钮对应的服务器操作，分别调用 `KeyManager` 的 `verifyKey` 和 `resetFailureCount` 方法。

- [x] **3.3.2: 实现配置热重载**

  - [x] 打开 `src/app/admin/config/page.tsx` 和 `ConfigForm.tsx`。
  - [x] 确保表单能读取并展示 `Settings` 表中的所有可配置项。
  - [x] 实现表单的保存操作，将修改后的值更新到数据库。
  - [x] **关键**: 实现一个机制来通知 `KeyManager` 和 `settings.ts` 等单例服务重新从数据库加载配置，而无需重启应用。这可能需要一个全局的事件发射器或一个特定的重载函数。

- [x] **3.3.3: 实现日志查询功能**
  - [x] 打开 `src/app/admin/logs/page.tsx` 和 `LogViewer.tsx`。
  - [x] 实现后端逻辑（可能在 `actions.ts` 中），用于从 `RequestLog` 和 `ErrorLog` 表中分页查询数据。
  - [x] 在前端实现分页控件和 UI，以展示查询到的日志数据。
  - [x] （可选）添加搜索和过滤功能。
