<div align="center">

  <h1>🤖 All Model Chat</h1>

  <p>
    <strong>专为 Google Gemini API 家族打造的现代化全能 AI 助手</strong>
  </p>

  <p>
    <a href="https://all-model-chat.pages.dev/" target="_blank">
      <img src="https://img.shields.io/badge/Online_Demo-Live-success?style=for-the-badge&logo=vercel&logoColor=white" alt="Online Demo">
    </a>
    <a href="https://ai.studio/apps/drive/1QTVIPSUjPTWHBzCFRBDG0aiGO6GLNwcD" target="_blank">
      <img src="https://img.shields.io/badge/Google_AI_Studio-Try_Now-4285F4?style=for-the-badge&logo=google" alt="Try in AI Studio">
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License">
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  </p>

  <br/>
  
  <a href="https://all-model-chat.pages.dev/" target="_blank">
    <img width="800" src="https://github.com/user-attachments/assets/bb9094cf-abea-4b4b-9514-93978877349c" alt="All Model Chat Screenshot" style="border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);"/>
  </a>

  <br/><br/>

  <p>
    <a href="https://github.com/yeahhe365/All-Model-Chat/issues">报告问题</a>
    &nbsp;·&nbsp;
    <a href="https://github.com/yeahhe365/All-Model-Chat/issues">功能请求</a>
  </p>

</div>

---

## 📖 项目简介

**All Model Chat** 是一款功能强大、支持多模态输入的聊天机器人界面，旨在提供与 Google Gemini API 家族无缝交互的极致体验。它集成了动态模型选择、多模态文件输入、流式响应、全面的聊天历史管理以及广泛的自定义选项。

无论是代码生成、创意写作，还是复杂的数据分析与多媒体处理，All Model Chat 都能为您带来无与伦比的 AI 互动体验。

---

## ✨ 功能亮点

### 🧠 核心 AI 能力
*   **广泛的模型支持**：原生支持 Gemini 全系列 (`2.5 Pro`, `Flash`, `Flash Lite`)、Imagen 绘图模型及 TTS 语音模型。
*   **强大的工具集成**：
    *   *Google Search*：访问实时网络信息并自动提供引用来源。
    *   *Code Execution*：内置 Python 代码执行器，解决复杂计算与数据分析问题。
    *   *URL Reading*：直接读取并理解网页链接内容。
*   **高级参数控制**：自定义 Temperature, Top-P, Top-K 和 System Prompt。
*   **深度思考模式**：可视化模型的中间推理步骤 (Thinking Process)。
*   **全双工语音交互**：支持高精度语音转文本 (STT) 和多音色文本转语音 (TTS)。

### 📁 文件与预览
*   **全格式支持**：处理图片、视频、音频、PDF 文档、代码及纯文本。
*   **便捷输入**：支持拖拽、粘贴、文件选择、**拍照**及**录音**。
*   **内置编辑器**：直接在应用内创建和修改文本文件作为上下文。
*   **智能画布 (Canvas)**：一键生成并预览交互式 HTML、SVG 矢量图及 ECharts 图表。

### 💬 极致体验
*   **本地历史记录**：基于 IndexedDB 存储，支持分组、搜索与置顶。
*   **Prompt 市场**：保存并一键调用常用的提示词模板。
*   **消息流控制**：支持实时编辑、删除、分支重试 (Regenerate)。
*   **多格式导出**：导出为 PNG 长图、HTML、TXT 或 JSON。
*   **跨平台支持**：响应式设计适配移动端，支持 PWA 安装。

---

## 🚀 快速开始

本应用为 **纯前端应用 (Serverless)**，直接在浏览器中运行，无需后端服务器。

1.  **打开应用**：访问 **[all-model-chat.pages.dev](https://all-model-chat.pages.dev/)**
2.  **进入设置**：点击右上角的齿轮图标。
3.  **配置 API**：开启“使用自定义 API 配置”。
4.  **输入密钥**：填入您的 [Google AI Studio API Key](https://aistudio.google.com/app/apikey)（支持多 Key 轮询）。
5.  **开始探索**：关闭设置即可使用。

> 🔒 **安全声明**：您的 API Key 仅加密存储在本地浏览器的 LocalStorage 中，直接与 Google 服务器通信，不经过任何中间方。

---

## 🛠️ 技术栈

| 领域 | 技术方案 |
| :--- | :--- |
| **核心框架** | React 19, TypeScript |
| **构建工具** | Vite |
| **AI SDK** | `@google/genai` (Official SDK) |
| **样式设计** | Tailwind CSS |
| **数据存储** | IndexedDB (Dexie.js) |
| **渲染引擎** | React Markdown, KaTeX, Mermaid, Highlight.js |

---

## 📁 项目结构

```bash
All-Model-Chat/
├── public/                 # 静态资源
├── src/
│   ├── components/         # React UI 组件
│   │   ├── chat/           # 聊天区域
│   │   ├── settings/       # 设置面板
│   │   └── sidebar/        # 侧边栏
│   ├── hooks/              # 自定义 Hooks (核心逻辑)
│   ├── services/           # API 服务层
│   ├── utils/              # 工具函数
│   └── App.tsx             # 入口组件
└── index.html
