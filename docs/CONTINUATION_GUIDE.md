# Gemini Balance Next.js 迁移项目 - 继续工作指南 (v2)

你好！我是 Cline，本项目的前期高级全栈开发工程师。我已经完成了项目的初始化、基础架构搭建 (P0)，并引入了健壮的自动化测试和代码质量保证流程。现在，我将把后续的开发工作交接给你。请严格遵循以下指南，以确保项目质量和开发流程的一致性。

## 1. 项目核心理念

在开始编码前，请务必理解本项目的核心设计哲学：

- **开源优先**: 我们的目标是创建一个对开源社区友好、易于理解、部署和贡献的项目。
- **简化配置**: 最大程度地减少用户在部署前需要手动配置的步骤。我们的目标是实现“零环境变量”的“开箱即用”体验。
- **减少依赖**: 审慎引入外部依赖。优先使用平台原生能力 (Next.js, Vercel/Cloudflare) 和 Web Standards API。
- **灵活部署**: 虽然我们优先为边缘平台（Vercel/Cloudflare + D1）优化，但架构设计必须保留在 Docker 环境中使用标准 Postgres 自托管的能力。

## 2. 当前项目状态

- **Git 分支**: 你当前应该在 `develop` 分支上。所有开发工作都应在此分支上进行。
- **已完成工作**:
  - **P0: 基础架构搭建**:
    - [x] 项目已使用 Next.js (App Router, no-src), TypeScript, Tailwind CSS, pnpm 初始化。
    - [x] Drizzle ORM 已集成，数据库 Schema 和配置文件已创建。
    - [x] API 路由重写规则已在 `next.config.js` 中配置。
    - [x] 核心服务层和配置服务的骨架已搭建完毕。
  - **P1: 核心代理功能 (部分)**:
    - [x] **任务 1.1**: 实现了 `key.service.ts` 中的密钥管理逻辑。
    - [x] **任务 1.2**: 实现了 `chat.service.ts` 中的 OpenAI-to-Gemini 请求转换逻辑。
  - **开发流程升级**:
    - [x] **单元测试**: 已集成 `Vitest` 测试框架，并为 `chat.service.ts` 编写了单元测试作为范例。
    - [x] **自动化质量保证**: 已配置 `Husky` 和 `lint-staged`，在每次代码提交前 (`pre-commit`) 自动运行代码格式化 (`ESLint`) 和相关单元测试 (`Vitest`)，确保代码库的稳定和健康。

## 3. 你的工作流程 (必须严格遵守)

这是我们最新制定的、包含自动化质量保证的工作流程。**请务必理解并遵守，这将极大提升你的开发效率和代码质量。**

1.  **查阅工作清单**: 打开 `docs/WORK_PLAN.md` 文件。这是你后续所有工作的唯一任务来源。

2.  **选择任务**: 从清单中选择**优先级最高**的、**未完成**的任务开始工作。

3.  **测试驱动开发 (TDD)**:
    a. **编写/修改测试用例**: 在实现业务逻辑**之前或期间**，请为你将要开发的功能在对应的 `*.test.ts` 文件中编写单元测试。这会强迫你从使用者的角度思考代码设计。
    b. **编码实现**: 按照任务描述和《Project_Migration_Proposal_NextJS_v2_ZH.md》中的详细设计，完成业务逻辑的编码工作，直到所有相关测试用例通过。

4.  **创建 Git 提交**:
    a. **暂存文件**: 使用 `git add .` 暂存你所有修改过的文件（包括业务代码和测试代码）。
    b. **执行提交**: 使用 `git commit -m "..."` 命令。 - **自动化检查**: 此时，我们配置的 `pre-commit` 钩子会自动触发。它会运行 `lint-staged`，对你暂存的文件执行 `ESLint` 格式化和 `Vitest` 单元测试。 - **失败则中止**: 如果 linter 发现错误，或任何一个测试用例失败，**本次提交将被自动中止**。你必须修复所有问题后，才能重新执行提交。
    c. **原子化提交**: 确保你的每次提交都只包含一个已完成的任务及其对应的测试。
    d. **遵循提交规范**: 使用**约定式提交 (Conventional Commits)** 规范来撰写 commit message。格式为：`feat(P1): implement feature X` 或 `fix(P2): resolve bug Y`。

5.  **更新工作清单**: 提交成功后，回到 `docs/WORK_PLAN.md` 文件，将你刚刚完成的任务标记为已完成 (`[x]`)。

## 4. 下一步工作 (你的起点)

你的第一个任务是 **任务 1.3**。

- **任务**: `[ ] **任务 1.3**: 实现 chat.service.ts 中的 Gemini-to-OpenAI **非流式响应**转换逻辑。`
- **实现细节参考**:
  - **文件**: `lib/services/chat.service.ts`
  - **方案**: 查阅 `docs/Project_Migration_Proposal_NextJS_v2_ZH.md` 的 **6.3 节** (响应转换部分)。
  - **关键逻辑**:
    - 创建一个 `convertGeminiResponseToOpenAI` 方法。
    - 负责将 Gemini API 的响应体映射为 OpenAI Chat Completion API 的格式。
    - 重点关注 `candidates` -> `choices`, `usageMetadata` -> `usage` 等字段的映射。
  - **测试**: 请在 `lib/services/chat.service.test.ts` 中为这个新方法补充单元测试。

祝你工作顺利！这个项目有巨大的潜力，你的贡献至关重要。
