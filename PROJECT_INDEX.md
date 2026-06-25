# 内装智能体 (interior-ai-workbench) — 项目代码索引文档

> 生成时间：2026-06-06 | 项目根目录：C:\Users\b\Desktop\NeizhuangAgent

---

## 一、项目概览

| 项目 | 说明 |
|------|------|
| **项目名** | interior-ai-workbench |
| **架构** | pnpm monorepo（rontend + ackend） |
| **用途** | AI 驱动的室内设计画布 — 通过可视化节点编排实现 AI 风格迁移、图像生成、局部重绘等 |
| **包管理器** | pnpm |
| **Node 要求** | >= 20 |
| **启动方式** | pnpm dev（并行启动前后端）或 pm2 resurrect（生产） |
| **前端地址** | http://localhost:5173（Vite 开发服务器） |
| **后端地址** | http://localhost:3000（NestJS） |
| **数据库** | PostgreSQL（Prisma ORM）+ IndexedDB（前端本地图片） |
| **AI 服务** | 豆包/Seedream（OpenAI 兼容 API） |

---

## 二、顶层文件索引

| 文件 | 作用 | 修改须知 |
|------|------|----------|
| package.json | monorepo 根配置、并行启动脚本 | 全局依赖放这里 |
| pnpm-workspace.yaml | 声明 rontend、ackend 为 workspace | 新增子包时修改 |
| pnpm-lock.yaml | 锁文件，勿手动改 | — |
| 	sconfig.base.json | 共享 TS 配置（路径别名等） | 修改会同时影响前后端 |
| ecosystem.config.js | PM2 生产启动配置（后端+前端） | 修改端口/进程名时需同步 |
| un-servers.bat | Windows 一键启动脚本（调用 PM2） | — |
| 总目标.txt | 产品需求文档，含 TapNow 七层级改造路线图 | 理解产品方向必读 |
| .gitignore | Git 忽略规则 | — |
| .codexignore | Codex 索引忽略规则 | — |
| .npmrc | npm 配置 | — |

### 根目录临时/辅助脚本（非核心，维护时期参考）

| 文件 | 推测用途 |
|------|----------|
| llbuild.cjs | 全量构建脚本 |
| ix_*.js / fix_*.py / _fix.ps1 | 历史问题修复脚本集合 |
| _fxg.py / _w.py / _write_toolbar.py | 历史辅助脚本 |
| _patch.js / _patch_mr.txt | 历史补丁文件 |
| ix_fe.py | 前端修复辅助脚本 |
| write-ms.js | 空文件，待完善 |
## 三、后端 (backend/) 完整索引

### 3.1 后端目录结构

`
backend/
├── .env                      # 环境变量（含 API Key，不提交）
├── .env.example              # 环境变量模板
├── package.json              # NestJS 依赖声明
├── tsconfig.json             # 后端 TS 配置
├── nest-cli.json             # NestJS CLI 配置
├── data.db / data.db-shm / data.db-wal  # SQLite 临时数据文件
├── prisma/
│   └── schema.prisma         # 数据库模型定义（PostgreSQL）
├── src/
│   ├── main.ts               # ★ 入口文件
│   ├── app.module.ts         # ★ 根模块
│   ├── ai-gateway/           # AI 网关模块（核心）
│   ├── auth/                 # 认证模块
│   ├── credits/              # 积分/配额模块
│   ├── nodes/                # 节点定义模块
│   ├── upload/               # 文件上传模块
│   └── workflows/            # 工作流持久化模块
└── dist/                     # 编译输出
`

### 3.2 后端模块详解

#### ★ 入口文件：src/main.ts

- 启动 NestJS 应用
- 设置 CORS（allow localhost:5173,5174）
- 全局 API 前缀 /api
- Body Parser 100MB 限制
- 静态资源映射：/api/ziyuan → ../../ziyuan/ 目录

#### ★ src/app.module.ts — 根模块

导入 6 个子模块：
| 模块 | 路由前缀 | 功能 |
|------|----------|------|
| AiGatewayModule | /api/generate | AI 图像生成核心 |
| AuthModule | /api/auth | 注册/登录 |
| CreditsModule | /api/credits | 积分管理 |
| NodesModule | /api/nodes | 节点元数据 |
| UploadModule | /api/upload | 图片上传 |
| WorkflowsModule | /api/workflows | 工作流 CRUD |
### 3.3 AI Gateway 模块 (ai-gateway/) — 最核心

| 文件 | 作用 | 关键内容 |
|------|------|----------|
| `ai-gateway.module.ts` | 模块注册 | 注册 Controller、Service、DoubaoProvider |
| `ai-gateway.controller.ts` | API 端点 | `POST /api/generate` 和 `POST /api/generate/inpaint` |
| `ai-gateway.service.ts` | 业务逻辑 | 模型路由（MODEL_MAP）、生成调用、inpaint、积分计算 |
| `types.ts` | 类型定义 | `AIGenerateRequest`、`AIGenerateResponse`、`GeneratedImage` |
| `providers/doubao.provider.ts` | 豆包 Provider | 调用豆包 Seedream 图像生成 API 和 Vision LLM 分析 |

**API 端点：**
- `POST /api/generate` — 通用 AI 生成（接收 prompt + imageRefs）
- `POST /api/generate/inpaint` — 局部重绘（接收 image + mask）

**依赖链：**
```
Controller → Service → DoubaoProvider → OpenAI SDK → 豆包 API
```

**修改生成逻辑时必须看的文件：**
1. `backend/src/ai-gateway/providers/doubao.provider.ts` — 实际调用 AI API
2. `backend/src/ai-gateway/ai-gateway.service.ts` — 模型路由和请求编排
3. `backend/src/ai-gateway/types.ts` — 请求/响应数据结构
4. `backend/.env` — API Key 和 Base URL 配置
### 3.4 Auth 模块 (auth/)

| 文件 | 作用 |
|------|------|
| `auth.module.ts` | 模块声明 |
| `auth.controller.ts` | `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/user/:id` |
| `auth.service.ts` | 内存用户注册/登录/查询（无数据库持久化，JWT token 为占位符）|

**⚠ 注意：** 当前为内存存储，服务器重启后用户数据丢失。为开发阶段占位实现。

### 3.5 Credits 模块 (credits/)

| 文件 | 作用 |
|------|------|
| `credits.module.ts` | 模块声明 |
| `credits.controller.ts` | `GET /api/credits/:userId`、`POST /api/credits/:userId/deduct`、`POST /api/credits/:userId/add`、`GET /api/credits/:userId/transactions` |
| `credits.service.ts` | 内存积分管理（余额查询、扣减、充值、交易记录）|

**⚠ 注意：** 同样是内存存储。默认初始积分 1000。

### 3.6 Nodes 模块 (nodes/)

| 文件 | 作用 |
|------|------|
| `nodes.module.ts` | 模块声明 |
| `nodes.controller.ts` | `GET /api/nodes`、`GET /api/nodes/:type` |
| `nodes.service.ts` | 返回硬编码的节点类型定义列表（10种节点）|

节点类型：`input-image`、`input-room`、`input-style`、`input-budget`、`input-constraints`、`ai-floor-plan`、`ai-render`、`ai-style-transfer`、`output-preview`、`output-export`

**⚠ 注意：** 这些节点类型与前端 `nodeCatalog.ts` 不完全一致，且大部分未被前端实际使用。

### 3.7 Upload 模块 (upload/)

| 文件 | 作用 |
|------|------|
| `upload.module.ts` | 模块声明 |
| `upload.controller.ts` | `POST /api/upload`、`POST /api/upload/from-url`、`DELETE /api/upload/:id` |
| `upload.service.ts` | 文件存储到 `ziyuan/` 目录，支持 URL 下载 |

### 3.8 Workflows 模块 (workflows/)

| 文件 | 作用 |
|------|------|
| `workflows.module.ts` | 模块声明 |
| `workflows.controller.ts` | `GET/POST/PUT/DELETE /api/workflows` |
| `workflows.service.ts` | 内存 Map 存储工作流（未使用 Prisma）|

**⚠ 注意：** 同样是内存存储，且未实际调用 Prisma。前端数据实际存储在 IndexedDB（`workspaceStore`）。

### 3.9 Prisma 数据库模型 (`prisma/schema.prisma`)

| 模型 | 字段 | 说明 |
|------|------|------|
| `User` | id, username, email, password, credits, createdAt, updatedAt | 用户表 |
| `Workflow` | id, name, nodes(JSON), edges(JSON), userId, createdAt, updatedAt | 工作流表 |
| `CreditTransaction` | id, userId, amount, type, nodeType, createdAt | 积分流水表 |
| `GeneratedImage` | id, workflowId, url, thumbnail, width, height, provider, model, prompt, createdAt | 生成图片记录 |

**⚠ 注意：** Prisma schema 已定义但未被实际使用！所有后端服务目前使用内存存储。
## 四、前端 (frontend/) 完整索引

### 4.1 前端目录结构

frontend/
├── index.html                入口 HTML
├── package.json              依赖：React18, @xyflow/react12, Zustand5, TailwindCSS3
├── vite.config.ts            Vite 配置（路径别名 @→src, 代理 /api→localhost:3000）
├── tailwind.config.ts        Tailwind CSS 配置
├── postcss.config.js         PostCSS 配置
├── tsconfig.json             前端 TS 配置
├── serve-clean.js            清理脚本
└── src/
    ├── main.tsx              ★ 入口文件
    ├── App.tsx               ★ 根组件
    ├── index.css             全局样式
    ├── types/index.ts        ★ 全局类型定义
    ├── store/                Zustand 状态管理
    ├── hooks/                自定义 Hooks
    ├── lib/                  工具库
    └── components/
        ├── canvas/           画布组件
        ├── layout/           布局组件
        └── nodes/            节点内嵌组件
### 4.2 入口文件链

| 文件 | 作用 |
|------|------|
| `src/main.tsx` | 清理旧 localStorage → 渲染 `<App />` → 挂载到 `#root` |
| `src/App.tsx` | 初始化 ReactFlow、QueryClient、加载工作流、路由三大视图（canvas/personal/team） |
| `src/index.css` | Tailwind 基础样式（@tailwind base/components/utilities） |

### 4.3 类型系统 — `src/types/index.ts`

**核心类型定义：**

| 类型 | 用途 |
|------|------|
| `InteriorNodeType` | 节点类型联合类型（11种） |
| `HandleSlot` | 连线槽位类型（7种） |
| `Workflow` | 工作流完整定义（nodes + edges + space） |
| `NodeConfig` | 节点配置（label, color, icon, category 等） |
| `ImageInput` | 图片输入数据（id, dataUrl, sourceNodeId, origin 等） |
| `GeneratedImage` | AI 生成的图片结果（url, ziyuanUrl 等） |
| `AIGenerateRequest` | 前端构造的生成请求 |
| `AIGenerateResponse` | 后端返回的生成响应 |
| `HandleSlotConfig` | 连线槽位配置（label, color, position, maxConnections） |
| `Template` | 模板定义 |

**HANDLE_SLOTS 常量：** 定义了 7 种连线槽位（底图、风格参考、物体参考、提示词、AI图片、图片、重绘图）。

**修改类型时必须看的文件：**
1. `frontend/src/types/index.ts` — 所有类型定义
2. `backend/src/ai-gateway/types.ts` — 后端对应类型（需保持同步）
### 4.4 Zustand Store 层

| Store 文件 | 核心职责 | 关键状态 |
|------------|----------|----------|
| `store/workflowStore.ts` | ★ 画布核心状态：nodes/edges CRUD、连接建立、工作流加载/序列化 | nodes[], edges[], nodeGenerating(Set), bumpVersion |
| `store/workspaceStore.ts` | 工作区管理：工作流列表 CRUD、标签切换 | workflows[], activeTab |
| `store/creditStore.ts` | 前端积分管理（独立于后端）| credits: 100 |
| `store/localeStore.ts` | 国际化语言切换 | locale: "zh-CN" |
| `store/templateStore.ts` | 模板系统（保存/加载/删除，存 localStorage）| templates[] |

**各 Store 关键方法：**

**workflowStore：**
- `onNodesChange` / `onEdgesChange` — 响应 ReactFlow 的节点/边变化
- `onConnect` — 建立连线时更新 slot 数据，传播 AI 图片到下游
- `loadWorkflow` — 从 IndexedDB 加载工作流（含图片反序列化 hydrateImages）
- `setNodeGenerating` — 标记节点正在生成中（显示 loading 遮罩）

**workspaceStore：**
- 数据持久化到 IndexedDB（database: `workflow_store`）
- `addWorkflow` / `deleteWorkflow` / `updateWorkflow` — 自动同步 IndexedDB
- `loadWorkflows` — 启动时加载所有工作流

### 4.5 Hooks 层

| Hook 文件 | 核心功能 | 依赖 |
|-----------|----------|------|
| `hooks/useNodeGenerate.ts` | ★ 生成核心：构造 prompt + 调用 AI → 上传结果到 ziyuan → 传播到下游节点 | useAIStream, workflowStore |
| `hooks/useAIStream.ts` | API 调用：POST /api/generate，含重试（指数退避）+ 错误 toast | fetch |
| `hooks/useUpstreamData.ts` | 图遍历：根据 edges 收集上游节点的图片和提示词（按 slot 分类）| workflowStore |
| `hooks/useImagePropagation.ts` | 图片自动传播：上游图片变化时下载→上传→写入下游节点 | workflowStore |
| `hooks/useUndoRedo.ts` | 撤销/重做：维护历史快照栈（MAX=50），Ctrl+Z/Ctrl+Shift+Z | workflowStore |
| `hooks/useClipboard.ts` | 复制/粘贴节点：Ctrl+C / Ctrl+V | workflowStore |
| `hooks/useConnectionValidator.ts` | 连线验证：检查类型白名单（TYPE_COMPAT）+ 连接数量上限 | workflowStore |
| `hooks/useInpaint.ts` | 局部重绘：POST /api/generate/inpaint | fetch |
| `hooks/useOutPaint.ts` | 扩图：四个方向扩展，创建新节点展示结果 | useAIStream, workflowStore |
| `hooks/useCostEstimate.ts` | 费用预估（本地计算，基于 NODE_COSTS 表）| — |
| `hooks/useT.ts` | 国际化翻译函数（当前为占位，直接返回 key）| — |
### 4.6 Lib 工具库

| 文件 | 核心功能 |
|------|----------|
| `lib/nodeCatalog.ts` | 节点目录（NODE_CATALOG，11种节点定义）、slot 标签/颜色映射 |
| `lib/imageDB.ts` | ★ IndexedDB 图片存储（替代 localStorage 5MB 限制）；stripImages/hydrateImages（序列化去重/还原）|
| `lib/utils.ts` | `cn()`（Tailwind class 合并）、`formatCredits()`、`generateId()` |
| `lib/i18n.ts` | 国际化函数（当前为占位）|
| `lib/migrateStorage.ts` | 从旧 localStorage 迁移图片到 IndexedDB |

### 4.7 组件层

#### 画布组件 (components/canvas/)

| 文件 | 核心功能 | 关键 Props/事件 |
|------|----------|-----------------|
| `DesignCanvas.tsx` | ★ 主画布：ReactFlow 渲染、拖拽创建节点、删除连线监听、自适应缩放 | `onDrop` → 创建节点；`handleConnect` → 验证后建立连接 |
| `NodePalette.tsx` | 左侧节点面板：展示可用节点类型，支持拖拽到画布 | 使用 NODE_CATALOG |
| `ConnectionEdge.tsx` | 自定义边样式，含删除按钮 | 监听 `edge:delete` 自定义事件 |

#### 布局组件 (components/layout/)

| 文件 | 核心功能 |
|------|----------|
| `Header.tsx` | 顶部导航栏（标题、用户信息、空间切换）|
| `Toolbar.tsx` | ★ 工具栏：保存工作流（stripImages → IndexedDB）、撤销重做按钮、清空画布 |
| `SpacePanel.tsx` | 工作区面板：展示 personal/team 工作流列表，打开/重命名/删除 |
| `AccountPanel.tsx` | 账户面板 |

#### 节点内嵌组件 (components/nodes/)

| 文件 | 对应节点类型 | 关键功能 |
|------|-------------|----------|
| `InteriorNode.tsx` | ★ 通用节点外壳 | 渲染 Handle（左侧多 slot + 右侧输出）、loading 遮罩、分发到子组件 |
| `InputImageNode.tsx` | `input-image` | 图片上传（拖拽/点击）、AI 生成、inpaint 入口、结果查看器 |
| `InputTextNode.tsx` | `input-text` | 文本输入（提示词）|
| `InputVideoNode.tsx` | `input-video` | 视频上传 |
| `InputPPTNode.tsx` | `input-ppt` | PPT 上传 |
| `ReceiveAINode.tsx` | `receive-ai` | 接收并展示 AI 生成的图片 |
| `CompareNode.tsx` | `compare` | 对比展示多张图片 |
| `StyleTransferNode.tsx` | `style-transfer` | 风格迁移参数设置 + 生成 |
| `MultiRenderNode.tsx` | `multi-render` | 批量渲染多张图片 |
| `PromptAnalyzeNode.tsx` | `prompt-analyze` | 提示词分析（Vision LLM）|
| `InpaintResultNode.tsx` | `inpaint-result` | 局部重绘结果展示 |
| `InpaintGenNode.tsx` | `inpaint-gen` | 局部重绘参数设置 |
| `InpaintOverlay.tsx` | — | 重绘遮罩层（绘制 mask）|
| `GenerateButton.tsx` | — | 通用生成按钮组件 |
| `ImageResultViewer.tsx` | — | 生成结果查看器（图片展示/下载）|
| `CollapsibleSettings.tsx` | — | 折叠参数面板 |
| `ModelRatioSelector.tsx` | — | 模型/比例/质量选择器 |
| `MultiRenderPrompts.ts` | — | 多渲染提示词配置 |

## 五、核心数据流

### 5.1 生成流程 (完整链路)

User Input (frontend)
  ├─ 1. InputImageNode 上传图片 -> ziyuan (POST /api/upload)
  ├─ 2. InputTextNode 输入提示词 -> node.data.inputs.desc
  ├─ 3. 连线 (onConnect) -> useConnectionValidator 验证
  ├─ 4. useUpstreamData 图遍历: 按 slot 分类采集上游数据
  ├─ 5. useNodeGenerate.handleGenerate() 构造 prompt + 调用 AI
  │    └─ useAIStream.generate() -> POST /api/generate
  │         └─ [Backend] AiGatewayService -> DoubaoProvider -> Seedream/Vision API
  └─ 6. 结果上传到 ziyuan, 写入 node.data._aiImages, 传播到下游节点

### 5.2 工作流持久化

Save: Toolbar.doSave() -> stripImages(nodes) -> IndexedDB(image_db_v2) + workspaceStore(workflow_store)
Load: SpacePanel -> workflowStore.loadWorkflow() -> hydrateImages/importBundle -> fitView

### 5.3 Inpaint (局部重绘)

InputImageNode -> InpaintOverlay(绘制mask) -> useInpaint -> POST /api/generate/inpaint -> DoubaoProvider


## 六、修改某个功能时必须看的文件 (速查表)

### 修改 AI 生成逻辑 (prompt/模型/参数)
1. backend/src/ai-gateway/providers/doubao.provider.ts — AI API 调用
2. backend/src/ai-gateway/ai-gateway.service.ts — 模型路由、prompt 构造
3. frontend/src/hooks/useNodeGenerate.ts — 前端 prompt 拼接 + 结果处理
4. frontend/src/hooks/useAIStream.ts — API 请求 + 重试逻辑

### 新增节点类型
1. frontend/src/types/index.ts — 添加 InteriorNodeType
2. frontend/src/lib/nodeCatalog.ts — 添加 NODE_CATALOG 条目
3. frontend/src/components/nodes/InteriorNode.tsx — 注册 M 映射 + Handle 配置
4. frontend/src/components/nodes/ 新建节点组件文件
5. frontend/src/hooks/useConnectionValidator.ts — 更新 TYPE_COMPAT

### 修改连线/连接验证规则
1. frontend/src/hooks/useConnectionValidator.ts — TYPE_COMPAT + 验证逻辑
2. frontend/src/types/index.ts — HANDLE_SLOTS + HandleSlotConfig
3. frontend/src/components/nodes/InteriorNode.tsx — Handle 配置

### 修改工作流保存/加载
1. frontend/src/store/workflowStore.ts — loadWorkflow
2. frontend/src/store/workspaceStore.ts — IndexedDB CRUD
3. frontend/src/lib/imageDB.ts — stripImages/hydrateImages
4. frontend/src/components/layout/Toolbar.tsx — doSave 逻辑
5. frontend/src/components/layout/SpacePanel.tsx — 列表 + 打开

### 修改图片上传/存储
1. backend/src/upload/upload.service.ts — 文件保存 + from-url
2. backend/src/upload/upload.controller.ts — API 端点
3. frontend/src/hooks/useImagePropagation.ts — 图片下载 + 上传传播
4. frontend/src/lib/imageDB.ts — IndexedDB 存储

### 修改积分/费用
1. frontend/src/store/creditStore.ts — 前端积分
2. frontend/src/hooks/useCostEstimate.ts — 费用预估
3. backend/src/ai-gateway/ai-gateway.service.ts — calcCredits
4. backend/src/credits/credits.service.ts — 后端积分管理

### 修改模板系统
1. frontend/src/store/templateStore.ts — 模板 CRUD
2. frontend/src/types/index.ts — Template 接口
3. frontend/src/components/canvas/NodePalette.tsx — 模板 tab

### 添加新的 AI Provider
1. backend/src/ai-gateway/providers/ — 新建 provider 文件
2. backend/src/ai-gateway/ai-gateway.module.ts — 注册 Provider
3. backend/src/ai-gateway/ai-gateway.service.ts — MODEL_MAP + 依赖注入
4. backend/.env — 添加 API Key
5. frontend/src/types/index.ts — 更新 AIProvider 类型


## 七、依赖关系图

### 前端依赖链

App.tsx
├── ReactFlowProvider (@xyflow/react)
├── QueryClientProvider (@tanstack/react-query)
├── DesignCanvas (components/canvas/)
│   ├── InteriorNode (components/nodes/)
│   │   ├── InputImageNode → useNodeGenerate, useUpstreamData, useInpaint
│   │   ├── InputTextNode
│   │   ├── ReceiveAINode
│   │   ├── CompareNode
│   │   ├── StyleTransferNode
│   │   ├── MultiRenderNode
│   │   ├── PromptAnalyzeNode
│   │   ├── InpaintResultNode
│   │   ├── InpaintGenNode
│   │   └── InputVideoNode / InputPPTNode
│   ├── NodePalette → nodeCatalog
│   ├── ConnectionEdge
│   └── useConnectionValidator
├── Header
├── Toolbar → imageDB, workspaceStore, useUndoRedo
├── SpacePanel → workspaceStore, workflowStore
├── CanvasWatcher → useUndoRedo, useClipboard
└── Stores: workflowStore, workspaceStore, creditStore, localeStore, templateStore

### 后端依赖链

main.ts
└── AppModule
    ├── AiGatewayModule → AiGatewayController → AiGatewayService → DoubaoProvider
    ├── AuthModule → AuthController → AuthService
    ├── CreditsModule → CreditsController → CreditsService
    ├── NodesModule → NodesController → NodesService
    ├── UploadModule → UploadController → UploadService
    └── WorkflowsModule → WorkflowsController → WorkflowsService


## 八、目录对照表 (ziyuan / test_screenshots)

### zyuan/
存放所有上传和 AI 生成的图片文件（UUID 命名 .png），通过 /api/ziyuan/{filename} 访问。
前端生成后自动上传到此目录做持久化。

### test_screenshots/
E2E 测试截图目录。

### frontend/frontend/src/components/nodes/InputImageNode.tsx
旧版 InputImageNode 备份（仅1个文件），已废弃，实际使用 rontend/src/components/nodes/InputImageNode.tsx。

## 九、关键待办/技术债务 (基于 总目标.txt)

### 已完成
- 无限画布 (minZoom/maxZoom)
- 连线分类 (image_normal/srefs/oref/prompt)
- 连线验证 (useConnectionValidator)
- Handle 多槽位 (InteriorNode)
- SSE 流式 (useAIStream)
- 结果展示 (ImageResultViewer)
- 自定义边 (ConnectionEdge)
- undo/redo (useUndoRedo)
- 复制粘贴 (useClipboard)
- 失败重试 (useAIStream maxRetries=3)
- 模板系统 (templateStore - localStorage 实现)
- Inpaint 局部重绘
- IndexedDB 图片存储 (imageDB.ts)

### 待完成 (按 总目标.txt P0→P1→P2)
- 生成确认面板 (confirm/cancel)
- 批量费用预估 API
- 执行管线 (暂停/恢复/中止)
- 编组模式 (GROUP 节点)
- 多选变体
- OutPainting 扩图
- 实时协作模式锁
- Prisma 数据库集成 (当前全为内存存储)

## 十、快速启动命令

# 开发模式
cd C:\Users\b\Desktop\NeizhuangAgent
pnpm dev

# 仅前端
pnpm dev:frontend

# 仅后端
pnpm dev:backend

# 生产模式 (PM2)
pm2 start ecosystem.config.js
# 或
run-servers.bat

