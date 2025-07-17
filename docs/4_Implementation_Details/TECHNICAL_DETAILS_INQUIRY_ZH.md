# 技术细节需求清单 (对标 Python 原项目)

**版本**: 1.0
**日期**: 2025 年 7 月 14 日
**制定人**: Cline，系统架构师

---

### 1. 背景

本文档旨在为 `gemini-balance-nextjs` 项目的后续开发，提供一份详细的技术细节需求清单。清单中的每一项都对应 `TODO_LIST_20250714_ZH.md` 中的一个具体开发任务，并明确了为了确保功能对等，需要从原 Python 项目中了解或确认的具体实现细节。

**核心原则**: P0 阶段的架构重构任务属于 Next.js 项目的内部优化，无需参考原项目。本清单主要聚焦于 P1 和 P2 阶段中需要与原项目功能行为保持一致的任务。

---

### 2. 需求清单详情

#### 任务 1: [P1] 实现定时任务中的密钥健康检查

- **对应 TODO**: `[功能] 实现定时任务 (node-cron)`
- **上下文**: 我们需要在 `server.js` 中设置一个定时任务，定期调用 `KeyManager` 的 `checkAndReactivateKeys()` 方法来检查已失效的密钥。
- **需要的技术细节**:
  1.  **健康检查的请求载荷 (Payload)**:
      - 原项目的 `check_and_reactivate_keys` 函数在测试一个失效的 Gemini API 密钥时，向 Gemini API 发送的具体请求是什么？
      - 是调用 `generateContent` 还是 `countTokens`？
      - 请求体中使用的 `model` 是什么？（例如，是固定的 `gemini-pro` 还是其他轻量级模型？）
      - 请求体中的 `contents` 是什么？（例如，是一个简单的 `"Hello"` 还是空内容？）
  2.  **成功与失败的判断标准**:
      - 原项目如何判断一次健康检查请求是“成功”的？是仅判断 HTTP 状态码为 `200 OK`，还是需要检查响应体中是否包含特定内容？

---

**技术细节解答**:

1.  **请求载荷 (Payload)**:
    - **API 接口**: 调用 `generateContent` 接口。
    - **请求模型**: 使用 `settings.TEST_MODEL`，其默认值为 `gemini-1.5-flash`。
    - **请求内容**: 请求体 `contents` 被硬编码为 `[{"role": "user", "parts": [{"text": "hi"}]}]`。
2.  **成功/失败判断**:
    - **成功标准**: 对 `generateContent` 的 API 调用**未抛出任何异常**即视为成功。
    - **失败标准**: API 调用过程中**抛出任何 `Exception`**（包括 HTTP 状态码非 200、网络超时等）即视为失败。

---

#### 任务 2: [P2] 兼容 OpenAI Embeddings API

- **对应 TODO**: `[功能] 兼容 OpenAI Embeddings API`
- **上下文**: 我们需要创建一个 `POST /openai/v1/embeddings` 路由，将 OpenAI 格式的请求转换为 Gemini 请求，并将 Gemini 的响应再转换回 OpenAI 格式。
- **需要的技术细节**:
  1.  **请求映射 (OpenAI -> Gemini)**:
      - **模型名称**: 当 OpenAI 请求中指定的 `model` 是什么时，原项目会将其路由到 Gemini 的 embedding 功能？Gemini embedding 模型的具体名称是什么（例如，`text-embedding-004` 或其他）？
      - **输入映射**: OpenAI 请求体中的 `input` 字段（可以是字符串、字符串数组）是如何被转换为 Gemini embedding 请求中的 `content` 字段的？
  2.  **响应映射 (Gemini -> OpenAI)**:
      - **数据结构**: Gemini embedding API 返回的 JSON 结构是什么？其中哪个字段包含了向量数据？
      - **格式转换**: 原项目是如何将 Gemini 的响应构造成一个符合 OpenAI 格式的 `{"object": "list", "data": [...]}` 结构的？具体来说，`data` 数组中的每个 `embedding` 对象的字段（`object`, `embedding`, `index`）是如何填充的？
      - **用量统计 (Usage)**: 原项目在返回的 `usage` 字段中，`prompt_tokens` 和 `total_tokens` 是如何计算的？Gemini 的 embedding API 是否会返回 token 计数？

---

**技术细节解答**:

- **实现模式**: **透明代理 (Transparent Proxy)**。原项目在此功能上并未实现协议转换。
- **请求处理**:
  - 它接收符合 OpenAI 官方 API 规范的 `/v1/embeddings` 请求 (参考文档: [https://platform.openai.com/docs/api-reference/embeddings/create](https://platform.openai.com/docs/api-reference/embeddings/create))。请求体主要包含：
    - `input` (string or array of strings): 需要进行向量化的一个或多个文本。
    - `model` (string): 指定要使用的 embedding 模型，例如 `text-embedding-ada-002`。
  - 使用 `openai-python` 库，将请求的 `base_url` 指向 `settings.BASE_URL`。
  - 将上述 OpenAI 请求体**原封不动地**转发给上游服务。
- **响应处理**:
  - 将上游服务返回的响应**原封不动地**返回给客户端。
  - **期望的响应格式**: 期望上游服务返回符合 OpenAI 官方规范的响应。主要结构为 `{"object": "list", "data": [{"object": "embedding", "embedding": [...], "index": 0}], "usage": {...}}`。
- **结论**: 此功能依赖于上游服务（`BASE_URL`）自身已经兼容 OpenAI 的 Embeddings API。Next.js 版本在实现此功能时，也应遵循此代理模式，而无需在应用内部实现复杂的请求/响应格式转换。

---

#### 任务 3: [P2] 兼容 OpenAI 图像生成 API

- **对应 TODO**: `[功能] 兼容 OpenAI 图像生成 API`
- **上下文**: 我们需要创建一个 `POST /openai/v1/images/generations` 路由，对标原项目的图像生成功能。
- **需要的技术细节**:
  1.  **请求映射 (OpenAI -> Gemini)**:
      - **模型名称**: Gemini 图像生成模型的具体名称是什么（例如，`imagen` 或其他）？
      - **参数映射**: OpenAI 请求体中的核心参数（`prompt`, `n`, `size`, `quality`, `style`）是如何被映射到 Gemini 图像生成 API 的请求参数中的？请提供详细的映射关系。
  2.  **响应映射 (Gemini -> OpenAI)**:
      - **数据格式**: Gemini 图像生成 API 返回的图像数据是 URL 链接、base64 编码的字符串，还是其他格式？
      - **格式转换**: 原项目是如何将 Gemini 的响应构造成一个符合 OpenAI 格式的 `{"created": ..., "data": [{"url": ...}]}` 或 `[{"b64_json": ...}]` 结构的？
      - **多图处理**: 如果 OpenAI 请求的 `n > 1`，Gemini API 是单次返回多张图片还是需要多次调用？原项目是如何处理这种情况的？

---

**技术细节解答**:

- **OpenAI API 格式参考**: [https://platform.openai.com/docs/api-reference/images/create](https://platform.openai.com/docs/api-reference/images/create)

1.  **请求映射 (OpenAI -> Gemini)**:
    - **Gemini 模型**: `imagen-3.0-generate-002` (来自 `settings.CREATE_IMAGE_MODEL`)。
    - **参数映射关系**:
      - `prompt` (string): 直接映射，但会预处理，去除自定义参数标记（如 `{n:2}`）。
      - `n` (integer): 优先使用 `prompt` 中 `{n:value}` 的值，若无则使用请求体中的 `n`。映射到 Gemini 的 `number_of_images`。
      - `size` (string): 映射到 Gemini 的 `aspect_ratio`。
        - `"1024x1024"` -> `"1:1"`
        - `"1792x1024"` -> `"16:9"`
        - `"1024x1792"` -> `"9:16"`
      - `quality` (string): **被忽略**。
      - `style` (string): **被忽略**。
      - `response_format` (string): 用于决定响应是返回 `url` 还是 `b64_json`。
2.  **响应映射 (Gemini -> OpenAI)**:
    - **Gemini 返回格式**: `image_bytes` (原始二进制图像数据)。
    - **转换流程**:
      1.  遍历 Gemini 返回的每张图片的二进制数据。
      2.  **如果 `response_format` 为 `b64_json`**: 对二进制数据进行 Base64 编码，构造成 `{"b64_json": "...", "revised_prompt": "..."}`。
      3.  **如果 `response_format` 为 `url`**: 将二进制数据上传到配置的第三方图床 (SM.MS, PicGo 等)，获取返回的 URL，构造成 `{"url": "...", "revised_prompt": "..."}`。
      4.  将上述生成的对象数组包装在 `data` 字段中，并添加 `created` 时间戳，形成最终的 OpenAI 格式响应 `{"created": ..., "data": [...]}`。
    - **多图处理**: Gemini 的 `generate_images` 接口通过 `number_of_images` 参数原生支持单次调用生成多张图片。
3.  **硬编码参数**: 调用 Gemini API 时，额外传入了 `output_mime_type`, `safety_filter_level`, `person_generation` 等参数。

---

### 3. 总结

获取以上技术细节对于确保 Next.js 版本与原 Python 项目在核心功能上实现精确对等至关重要。这将帮助我们避免重复“造轮子”或因猜测而导致的实现偏差，从而提高开发效率和最终产品的质量。
