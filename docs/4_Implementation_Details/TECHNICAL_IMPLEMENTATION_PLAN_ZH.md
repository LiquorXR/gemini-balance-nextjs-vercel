# Gemini Balance Next.js - 技术细节实现方案

**版本**: 1.0
**日期**: 2025-07-15
**制定人**: Cline (系统分析师)

## 1. 目的

本方案旨在为《下一阶段开发计划》中 P0 和 P1 优先级的任务提供具体、可操作的技术实现指导。通过深入分析原始 Python 项目 (`gemini-balance`) 的核心实现，我们为 Next.js 版本的开发人员提供一条清晰的路径，以高效、准确地复现关键功能，减少重复研究和试错成本。

## 2. 核心待办任务技术方案

### 2.1 [P0] 修复 API 路由未受保护的问题

- **目标**: 为所有 API 端点（`gemini/*`, `openai/*`, `v1beta/*`）添加强制性授权验证。
- **Next.js 目标文件**:
  - `src/app/openai/v1/chat/completions/route.ts`
  - `src/app/gemini/v1beta/[...model]/route.ts` (需要创建)
  - `src/app/v1beta/[...model]/route.ts` (需要创建)
  - `src/lib/auth.ts` (需要创建)
- **Python 参考文件**:
  - `app/core/security.py`: 包含核心的令牌验证逻辑。
  - `app/router/openai_routes.py`: 展示了如何在路由中应用安全验证。

#### **实现步骤**:

1.  **创建认证核心函数 (`src/lib/auth.ts`)**:

    - 创建一个名为 `isAuthenticated` 的异步函数，接收 `Request` 对象作为参数。
    - 此函数应从请求头 `Authorization: Bearer <token>` 或查询参数 `?key=<token>` 中提取令牌。
    - 从数据库 (`Settings` 表) 或环境变量中获取 `ALLOWED_TOKENS` 列表。
    - 验证提取出的令牌是否存在于 `ALLOWED_TOKENS` 列表中。
    - 如果验证失败，返回一个 `NextResponse` 对象，状态码为 `401 Unauthorized`，并附带错误信息。
    - 如果验证成功，返回 `null`。

2.  **在 API 路由中应用认证**:

    - 在每个 API 路由文件（如 `chat/completions/route.ts`）的 `POST` (或 `GET`) 函数的开头，立即调用 `isAuthenticated` 函数。
    - **示例代码**:

      ```typescript
      import { NextResponse } from "next/server";
      import { isAuthenticated } from "@/lib/auth"; // 引入新建的认证函数

      export async function POST(request: Request) {
        const authError = await isAuthenticated(request);
        if (authError) {
          return authError; // 如果认证失败，立即返回 401 响应
        }

        // ... 此处是原始的路由业务逻辑 ...
      }
      ```

3.  **清理中间件**: 移除或重构 `src/middleware.ts` 中与 API 认证相关的、已被注释的代码，使其只专注于 UI 的会话检查和重定向。

---

### 2.2 [P1] 实现 API 请求的自动失败重试

- **目标**: 在 API 请求失败时，自动使用下一个可用密钥进行重试，而不是直接返回错误。
- **Next.js 目标文件**: `src/lib/gemini-proxy.ts` (或创建一个新的重试处理器模块)
- **Python 参考文件**: `app/handler/retry_handler.py`

#### **实现步骤**:

1.  **创建重试循环逻辑**:

    - 在 `gemini-proxy.ts` 的 `streamGemini` 函数（或一个新建的包装函数）中，实现一个 `for` 循环，其最大循环次数由系统设置中的 `MAX_RETRIES` 决定。
    - 将原始的 `gemini.getGenerativeModel(...).generateContentStream(...)` 调用放在 `try...catch` 块内。

2.  **集成 KeyManager 进行失败处理**:

    - 在 `catch` 块中，捕获到 API 调用异常后，执行以下操作：
      a. 调用 `keyManager.handleApiFailure(currentApiKey, attemptNumber)`。此函数会禁用当前的失败密钥。
      b. `handleApiFailure` 应返回一个新的可用密钥。
      c. 更新 `currentApiKey` 变量为新的密钥。
      d. 在下一次循环中，使用新的密钥重新尝试 API 调用。

3.  **处理最终失败**:

    - 如果循环完成（所有重试次数用尽）或 `keyManager` 无法提供新的可用密钥，则抛出最后一次捕获到的异常，将最终错误返回给客户端。

4.  **代码结构建议 (伪代码)**:

    ```typescript
    // 在 src/lib/gemini-proxy.ts 或新文件中
    async function callWithRetry(originalRequest, keyManager) {
      let lastError = null;
      const maxRetries = await settings.get("MAX_RETRIES", 3);
      let apiKey = await keyManager.getAvailableKey();

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // 使用当前 apiKey 发起 API 请求
          return await makeApiCall(originalRequest, apiKey);
        } catch (e) {
          lastError = e;
          console.warn(
            `Attempt ${attempt + 1} failed for key ${apiKey}. Retrying...`
          );
          // 报告失败并获取新密钥
          const newKey = await keyManager.handleApiFailure(apiKey, attempt + 1);
          if (newKey) {
            apiKey = newKey;
          } else {
            // 没有更多可用密钥
            break;
          }
        }
      }
      // 所有重试失败，抛出最终错误
      throw lastError;
    }
    ```

---

### 2.3 [P1] 完善 OpenAI 兼容层

- **目标**: 正确处理 `system` 角色和 `image_url` 等多模态内容。
- **Next.js 目标文件**: `src/lib/google-adapter.ts`
- **Python 参考文件**: `app/handler/message_converter.py`

#### **实现步骤**:

1.  **修改 `adaptOpenAIRequestToGemini` 函数**:

    - 该函数应返回一个元组 `[convertedMessages, systemInstruction]`，而不仅仅是 `convertedMessages`。

2.  **实现 `system` 角色分离**:

    - 在函数开始处，初始化一个空数组 `systemInstructionParts`。
    - 遍历传入的 `messages` 列表。
    - 当遇到 `role: 'system'` 的消息时：
      a. 从其 `content` 中提取所有文本部分。
      b. 将这些文本部分添加到 `systemInstructionParts` 数组中。
      c. **不要**将此 `system` 消息添加到主 `convertedMessages` 列表中。
    - 在函数末尾，如果 `systemInstructionParts` 不为空，则构造一个 `systemInstruction` 对象 (`{ role: 'system', parts: systemInstructionParts }`) 并返回。

3.  **实现 `image_url` 内容转换**:

    - 在遍历 `messages` 时，如果消息的 `content` 是一个数组（多模态内容），则遍历该数组。
    - 当 `content` 数组中的一个项目 `type` 为 `image_url` 时：
      a. 获取 `image_url.url` 的值。
      b. **判断 URL 类型**:
      - 如果 URL 以 `data:image/...;base64,` 开头，直接提取 MIME 类型和 Base64 数据。
      - 如果是标准的 `http://` 或 `https://` URL，则需要使用 `fetch` API 异步下载图片内容，然后将其转换为 Base64 字符串。
        c. 将转换后的结果构造成 Gemini 需要的 `inline_data` 对象 (`{ inline_data: { mime_type: '...', data: '...' } }`)，并添加到 `parts` 数组中。

4.  **更新函数签名和调用**:
    - 更新 `adaptOpenAIRequestToGemini` 的返回类型。
    - 在 `chat/completions/route.ts` 中，接收返回的 `systemInstruction`，并将其传递给 `gemini-proxy`。
    - 在 `gemini-proxy` 中，将 `systemInstruction` 正确地放入 `generateContentStream` 的请求体中。

通过遵循以上技术方案，开发团队可以系统性地、高效地完成下一阶段的核心开发任务，确保 Next.js 版本在功能和健壮性上与原始设计对齐。
