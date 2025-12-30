
# 🤖 All Model Chat (v1.8.4)

<div align="center">

  <p>
    <strong>专为 Google Gemini API 生态打造的旗舰级全能 AI 工作台</strong>
  </p>

  <p>
    <a href="https://all-model-chat.pages.dev/" target="_blank">
      <img src="https://img.shields.io/badge/Online_Demo-Live-success?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Online Demo">
    </a>
    <a href="https://github.com/yeahhe365/All-Model-Chat/releases" target="_blank">
      <img src="https://img.shields.io/github/v/release/yeahhe365/All-Model-Chat?style=for-the-badge&color=blue" alt="Release">
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License">
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Gemini_SDK-1.31+-8E75B2?style=flat-square&logo=google&logoColor=white" alt="Gemini SDK">
  </p>

</div>

---

## 📖 项目简介

**All Model Chat** 是一款基于 React 构建的现代化 AI 聊天界面，旨在深度挖掘 **Google Gemini 3.0** 及 **2.5** 系列模型的全部潜力。

它不仅仅是一个聊天窗口，更是一个集成了**实时多模态交互 (Live API)**、**深度思考控制 (Thinking Mode)**、**Canvas 可视化**以及**本地优先数据管理**的生产力工具。无需服务器，直接在浏览器中与 Gemini API 通信。

## ✨ 核心特性

### 🧠 前沿模型能力
*   **Gemini 3.0 原生支持**：完美支持 `Gemini 3.0 Pro` 和 `Flash`，适配最新的 API 特性。
*   **深度思考模式 (Thinking Mode)**：
    *   **可视化思维链**：实时查看模型的逐步推理过程，支持折叠/展开。
    *   **精细控制**：支持设置 Token 预算 (Budget) 或使用预设等级 (Low/High/Minimal) 来平衡速度与深度。
*   **Live API (实时会话)**：
    *   ⚡ **低延迟语音/视频通话**：体验毫秒级响应的实时 AI 交互。
    *   🌊 **音频可视化**：内置动态波形和 Orb 动画效果。
    *   📹 **视频流处理**：支持开启摄像头进行实时视觉问答。

### 🎨 智能画布 (Canvas)与可视化
*   **Artifacts 侧边栏**：代码、SVG、HTML 预览会自动在侧边栏打开，支持代码/预览切换。
*   **Canvas 模式**：一键生成交互式 HTML 应用、ECharts 图表、Mermaid 流程图或 Graphviz 架构图。
*   **沉浸式预览**：HTML 内容支持自动全屏预览，如同原生应用般的体验。

### 🛠️ 强大的工具链
*   **Deep Search (深度搜索)**：集成了 Google Search 工具，支持多步推理和引用来源聚合。
*   **Code Execution**：内置 Python 代码沙箱，模型可编写并运行代码，直接展示运行结果。
*   **URL Context**：直接读取网页链接内容作为上下文。
*   **Imagen 3/4 绘图**：支持文本生图，可选生成 4 张变体 (Quad Image Mode)。

### 📁 高级文件处理
*   **智能音频压缩**：客户端自动将音频压缩为 16kHz MP3 (64kbps)，节省 90% Token 用量。
*   **全格式支持**：支持拖拽 PDF、Word、Excel、音频、视频、代码文件。
*   **文件夹/Zip 导入**：拖拽文件夹或 Zip 包，自动解析目录结构并转换为文本上下文，适合代码库分析。
*   **视频切片配置**：支持设置视频的起止时间戳 (Clip) 和 采样率 (FPS)，精准提取视频片段。

### ⚡ 极致体验
*   **本地优先 (Local-First)**：所有聊天记录、设置和密钥均存储在本地 IndexedDB，保护隐私。
*   **场景管理 (Scenarios)**：内置 Prompt 市场（如 FOP, Socratic, Pyrite），支持自定义导入/导出。
*   **语音交互**：支持实时录音转文字 (Whisper/Gemini ASR) 和多角色 TTS 语音朗读。
*   **PWA 支持**：可作为独立应用安装到桌面或手机，支持离线加载。

---

## ⚙️ 系统配置

### API 配置策略
1.  **多 Key 轮询**：支持输入多个 API Key，系统会自动轮询使用，避免单 Key 速率限制。
2.  **会话级 Key 锁定**：当上传文件或使用特定功能时，自动锁定当前会话使用的 Key，防止上下文丢失。
3.  **Vertex AI 支持**：内置 Vertex AI Express 端点配置，支持通过代理连接。
4.  **连接测试**：内置一键 API 连通性测试工具。

### 开发者工具
*   **Log Viewer (日志查看器)**：内置专业级控制台，可查看详细的 API 请求/响应日志、Token 消耗统计和错误堆栈。
*   **数据导出**：支持将对话导出为 JSON、Markdown、HTML 或 PNG 长图（自动拼接长对话）。

---

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/yeahhe365/All-Model-Chat.git
cd All-Model-Chat
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境 (可选)
复制 `.env.example` 为 `.env.local` 并填入你的 API Key（也可以在网页设置中填入）：
```env
GEMINI_API_KEY=your_api_key_here
```

### 4. 启动开发服务器
```bash
npm run dev
```
访问 `http://localhost:5173` 即可开始使用。

---

## 🛠️ 技术栈

| 领域 | 技术方案 | 说明 |
| :--- | :--- | :--- |
| **核心框架** | React 18+ | 配合最新的 Hooks 模式 |
| **构建工具** | Vite 5 | 秒级热更新，极速构建 |
| **AI SDK** | `@google/genai` | 官方最新 SDK (v1.31+)，支持 Live/Thinking API |
| **样式** | Tailwind CSS | 响应式设计，内置 **Pearl (亮色)** 和 **Onyx (暗色)** 主题 |
| **数据库** | IndexedDB | 原生封装，无第三方库依赖，高性能本地存储 |
| **渲染引擎** | React Markdown | 支持 GFM, KaTeX (公式), Highlight.js (代码高亮) |
| **图表引擎** | Mermaid, Viz.js | 流程图、时序图与 Graphviz 渲染 |
| **音频处理** | AudioWorklet + Lamejs | 浏览器原生音频流处理与 MP3 编码 |

---

## 📁 项目结构概览

```bash
src/
├── components/
│   ├── chat/           # 聊天核心组件 (输入框、消息列表、Live状态条)
│   ├── layout/         # 布局组件 (Sidebar, SidePanel, PiP)
│   ├── message/        # 消息渲染 (Markdown, CodeBlock, Thoughts, Artifacts)
│   ├── modals/         # 各类弹窗 (Settings, Scenarios, Exports, LiveSession)
│   ├── recorder/       # 音频录制与可视化组件
│   └── settings/       # 设置面板分栏
├── hooks/
│   ├── chat/           # 聊天状态管理、历史记录、滚动逻辑
│   ├── chat-stream/    # 流式响应处理、消息拼接
│   ├── file-upload/    # 文件预处理、上传队列、压缩逻辑
│   ├── live-api/       # Live API 连接、音视频流处理
│   └── message-sender/ # 消息发送编排 (Text, Image, Canvas, Tools)
├── services/           # API 服务层 (Gemini SDK 封装, LogService)
├── utils/              # 工具函数 (DB, Exports, AudioProcessing)
└── constants/          # 常量定义 (Prompts, Models, Themes)
```

---

## 🤝 贡献

欢迎提交 Issue 或 Pull Request！无论是修复 Bug、添加新翻译还是开发新功能，我们都非常感谢您的贡献。

## 📄 许可证

MIT License
