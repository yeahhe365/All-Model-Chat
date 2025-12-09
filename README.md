
<div align="center">

  <h1>🤖 All Model Chat</h1>

  <p>
    <strong>专为 Google Gemini API 生态打造的现代化全能 AI 工作台</strong>
  </p>

  <p>
    <a href="https://all-model-chat.pages.dev/" target="_blank">
      <img src="https://img.shields.io/badge/Online_Demo-Live-success?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Online Demo">
    </a>
    <a href="https://ai.studio/apps/drive/1QTVIPSUjPTWHBzCFRBDG0aiGO6GLNwcD?fullscreenApplet=true" target="_blank">
      <img src="https://img.shields.io/badge/Google_AI_Studio-Try_Now-4285F4?style=for-the-badge&logo=google" alt="Try in AI Studio">
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License">
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Gemini_SDK-1.31-8E75B2?style=flat-square&logo=google&logoColor=white" alt="Gemini SDK">
  </p>

  <br/>
  
  <table>
    <tr>
      <td align="center" width="33%">
        <p><strong>Pearl Theme (Light)</strong></p>
        <img src="https://github.com/user-attachments/assets/397ad36f-a2c3-4ca8-b691-f465cbabaa79" alt="Light Theme" style="border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);" />
      </td>
      <td align="center" width="33%">
        <p><strong>Onyx Theme (Dark)</strong></p>
        <img src="https://github.com/user-attachments/assets/950a493e-65c7-4f82-997a-31e11b57031f" alt="Dark Theme" style="border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);" />
      </td>
      <td align="center" width="33%">
        <p><strong>Mobile / PWA</strong></p>
        <img src="https://github.com/user-attachments/assets/1abd8a10-d3ed-49b1-9135-e44265da9233" alt="Mobile UI" style="border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);" />
      </td>
    </tr>
  </table>

  <br/><br/>

  <p>
    <a href="https://github.com/yeahhe365/All-Model-Chat/issues">报告问题</a>
    &nbsp;·&nbsp;
    <a href="https://github.com/yeahhe365/All-Model-Chat/issues">功能请求</a>
  </p>

</div>

---

## 📖 项目简介

**All Model Chat** 是一款基于 React 19 构建的旗舰级 AI 聊天界面，旨在挖掘 Google Gemini API 的全部潜力。它不仅是一个聊天窗口，更是一个集成了多模态处理、代码执行、深度搜索和可视化创作的生产力工具。

支持 **Gemini 3.0 Pro**、**Gemini 2.5** 全系列、**Imagen 3** 绘图以及 **Google Search** 等工具调用，提供媲美原生应用的流畅体验。

---

## ✨ 核心功能

### 🧠 前沿 AI 能力
*   **Gemini 3.0 支持**：原生支持最新的 Gemini 3.0 模型，包括 Thinking Config（思维链）配置。
*   **深度思考模式 (Thinking Mode)**：可视化模型的推理过程，支持自定义 Token 预算或预设等级（Low/High）。
*   **强大的工具链**：
    *   🛰️ **Deep Search**：多步深度联网搜索，自动聚合引用来源。
    *   🐍 **Code Execution**：内置 Python 代码沙箱，实时运行并展示结果。
    *   🔗 **URL Context**：直接读取网页内容作为上下文。
*   **多模态交互**：支持文本、语音（TTS/ASR）、图片（Vision/Imagen）、视频理解。

### 🎨 智能画布与可视化
*   **Canvas 模式**：一键生成交互式 HTML 应用、ECharts 图表或 SVG 矢量图，并支持独立全屏预览。
*   **Side Panel (侧边栏预览)**：在对话右侧实时渲染 HTML、Mermaid 流程图或 Graphviz 架构图，支持代码/预览切换。
*   **HTML 自动全屏**：检测到 HTML 代码块时自动提供沉浸式预览体验。

### 📁 高级文件处理
*   **全格式支持**：PDF、Word、Excel、音频、视频、代码文件。
*   **文件夹/Zip 导入**：支持拖拽整个文件夹或 Zip 包，自动解析目录结构并转换为文本上下文。
*   **视频切片**：支持设置视频的起止时间戳和 FPS，精准提取视频片段进行分析。
*   **YouTube 集成**：直接粘贴 YouTube 链接进行视频内容问答。

### ⚡ 极致体验与效率
*   **本地优先**：基于 IndexedDB 存储所有聊天历史、设置和文件，保护隐私。
*   **场景管理 (Scenarios)**：内置 Prompt 市场（如 FOP, Socratic, Pyrite），支持自定义和导出。
*   **语音交互**：支持实时录音转文字 (Whisper/Gemini ASR) 和多角色语音朗读 (TTS)。
*   **斜杠命令**：输入 `/` 快速调用模型切换、搜索开关、文件上传等功能。
*   **画中画 (PiP)**：支持将聊天窗口弹出为独立悬浮窗，多任务并行神器。
*   **PWA 支持**：可作为独立应用安装到桌面或手机。

---

## ⚙️ 系统配置

### API 配置
支持两种模式：
1.  **环境变量**：通过 `.env` 配置默认 Key。
2.  **自定义配置**：在设置中输入自己的 API Key（支持多 Key 轮询）。
    *   支持配置 **API Proxy URL** (兼容 Vertex AI Express)。
    *   内置连接测试工具。

### 开发者工具
*   **日志查看器 (Log Viewer)**：内置控制台，可查看 API 请求详情、Token 消耗统计和错误日志。
*   **数据导出**：支持导出聊天记录为 JSON、Markdown (TXT)、HTML 或 PNG 长图。

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
复制 `.env.example` 为 `.env.local` 并填入你的 API Key：
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

| 领域 | 技术方案 | 备注 |
| :--- | :--- | :--- |
| **核心框架** | React 19 | 利用最新的 Hook API |
| **语言** | TypeScript 5.5 | 全类型安全 |
| **构建工具** | Vite 5 | 秒级热更新 |
| **AI SDK** | `@google/genai` | 官方最新 SDK (v1.31+) |
| **样式** | Tailwind CSS | 响应式设计，暗黑模式支持 |
| **数据库** | IndexedDB | 原生封装，无第三方库依赖 |
| **渲染引擎** | React Markdown | 支持 GFM, KaTeX, Highlight.js |
| **图表引擎** | Mermaid, Viz.js | 流程图与关系图渲染 |

---

## 📁 项目结构

```bash
src/
├── components/
│   ├── chat/           # 聊天主界面、输入框、消息列表
│   ├── layout/         # 布局组件 (Sidebar, SidePanel)
│   ├── message/        # 消息渲染 (Markdown, CodeBlock, Artifacts)
│   ├── modals/         # 各种弹窗 (Settings, Scenarios, Exports)
│   └── settings/       # 设置面板各分栏
├── hooks/              # 核心逻辑 Hooks (Chat, Files, Audio, etc.)
├── services/           # API 服务层 (Gemini SDK, LogService)
├── utils/              # 工具函数 (DB, Exports, Translations)
├── constants/          # 常量定义 (Prompts, Models, Themes)
└── types/              # TypeScript 类型定义
```

---

## 🤝 贡献

欢迎提交 Issue 或 Pull Request！无论是修复 Bug、添加新翻译还是开发新功能，我们都非常感谢您的贡献。

## 📄 许可证

MIT License
