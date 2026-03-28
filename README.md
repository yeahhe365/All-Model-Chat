# 🤖 All Model Chat

<div align="center">

  <p>
    <strong>专为 Google Gemini API 生态打造的旗舰级全能 AI 工作台</strong>
  </p>

  <p>
    <a href="https://all-model-chat.pages.dev/" target="_blank">
      <img src="https://img.shields.io/badge/在线演示-Live_Demo-6366f1?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Online Demo">
    </a>
    <a href="https://github.com/yeahhe365/All-Model-Chat/releases" target="_blank">
      <img src="https://img.shields.io/github/v/release/yeahhe365/All-Model-Chat?style=for-the-badge&color=3b82f6" alt="Release">
    </a>
    <a href="https://ai.studio/apps/drive/1Y2timylzWs4cngOe85xjpD3vO0eznyAX?fullscreenApplet=true" target="_blank">
      <img src="https://img.shields.io/badge/Google%20AI%20Studio-Try_it_now-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Try in AI Studio">
    </a>
    <img src="https://img.shields.io/badge/许可证-MIT-green?style=for-the-badge" alt="License">
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Tailwind-3.4-38BDB8?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind">
    <img src="https://img.shields.io/badge/Gemini_SDK-1.31+-8E75B2?style=flat-square&logo=google&logoColor=white" alt="Gemini SDK">
  </p>

</div>

---

## 📖 项目简介 / Overview

**All Model Chat** 是一款基于 React 18 深度定制的高性能 AI 交互终端。它不仅支持传统的文本对话，更原生集成了 **Google Gemini 3.0 & 2.5** 系列模型的最前沿特性。

项目坚持 **Local-First (本地优先)** 原则，数据存储于浏览器 IndexedDB，无需后端服务器，在保障隐私的同时提供媲美原生应用的响应速度。它是你连接 Google 最强 AI 算力的全能工作桥梁。

---

## ✨ 核心能力 / Flagship Capabilities

| 🧠 **深度推理 (Thinking)** | 🎙️ **实时音视频 (Live API)** | 🎨 **智能看板 (Canvas)** |
| :--- | :--- | :--- |
| **思维链可视化**：适配 Gemini 3.0，支持设置 **Token 预算**或**推理等级 (Minimal-High)**。实时查看 AI 的逻辑演算过程。 | **毫秒级交互**：集成双向实时流。支持语音通话、屏幕共享视觉识别，配合动态 **Orb 音频可视化**。 | **Artifacts 模式**：代码块自动识别预览。一键将信息转化为交互式 HTML 看板、ECharts 图表或 Mermaid 流程图。 |

| 📁 **高级文件处理** | 🔍 **生产力工具链** | 🔐 **企业级 API 管理** |
| :--- | :--- | :--- |
| **智能压缩**：客户端自动将音频转码为 16kHz MP3，节省 90% Token。支持 **ZIP/文件夹拖入**自动解析代码库。 | **深度搜索**：聚合 Google Search，自动规划搜索任务并提供精准引用。内置 **Python 代码沙箱**运行环境。 | **多 Key 轮询**：支持填入多个 API Key 自动分担压力。原生兼容 **Vertex AI Express** 代理端点。 |

---

## 🚀 快速开始 / Quick Start

### 1. 安装与运行
```bash
# 克隆仓库
git clone https://github.com/yeahhe365/All-Model-Chat.git
cd All-Model-Chat/all-model-chat

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 2. 配置密钥
访问 `http://localhost:5173`，在**设置 -> API 密钥**中填入你的 Gemini API Key。
> **Pro Tip**: 你也可以在根目录创建 `.env.local` 填入 `GEMINI_API_KEY=xxx` 实现自动加载。

---

## 🌐 Multi-Provider Support

All Model Chat now supports multiple AI providers beyond Google Gemini:

| Provider | Models | Context Window | Configuration |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | Gemini 3.0, 2.5, Gemma | Up to 2M tokens | API Key or Environment Variable |
| **MiniMax AI** | MiniMax-M2.7, MiniMax-M2.7-highspeed | 204K tokens | Settings > API Configuration |

To use MiniMax models, enter your MiniMax API key in **Settings > API Configuration > MiniMax AI Configuration**, then select a MiniMax model from the model picker.

> Get your MiniMax API key at [platform.minimax.chat](https://platform.minimax.chat)

---

## 🛠️ 技术架构 / Technical Architecture

<table width="100%">
  <tr>
    <td width="20%"><b>核心框架</b></td>
    <td>React 18 + TypeScript 5.5 + Vite 5 (极速 HMR)</td>
  </tr>
  <tr>
    <td width="20%"><b>持久化层</b></td>
    <td>原生 <b>IndexedDB</b> (封装 db.ts)，支持原子化事务与大数据量日志存储</td>
  </tr>
  <tr>
    <td width="20%"><b>音频引擎</b></td>
    <td><b>AudioWorklet API</b> (实时流处理) + <b>Lamejs</b> (Web Worker 异步压缩)</td>
  </tr>
  <tr>
    <td width="20%"><b>渲染引擎</b></td>
    <td>React-Markdown + KaTeX (公式) + Highlight.js (代码) + Mermaid.js</td>
  </tr>
  <tr>
    <td width="20%"><b>网络拦截</b></td>
    <td>自定义 <b>Network Interceptor</b>，动态重写 SDK 请求路径以兼容各类代理与 Vertex AI</td>
  </tr>
</table>

---

## 📂 项目结构 / Structure

```bash
src/
├── components/          # 模块化 UI 组件
│   ├── chat/            # 输入框、消息列表、Live 状态条
│   ├── message/         # 消息渲染引擎 (Markdown, 代码块, 思考过程)
│   ├── log-viewer/      # 开发者日志面板 (实时监控 API 与 Token)
│   └── modals/          # 场景市场、文件配置、导出等功能弹窗
├── hooks/               # 核心逻辑 (逻辑与视图分离)
│   ├── live-api/        # WebRTC、音视频流媒体处理逻辑
│   ├── message-sender/  # 消息发送编排 (流式处理、错误拦截)
│   └── file-upload/     # 文件预处理、MP3 压缩策略
├── services/            # 外部服务 (Gemini SDK 深度封装)
└── utils/               # 工具类 (文件夹上下文解析、IndexedDB 包装)
```

---

## 🤝 参与贡献 / Contribution

我们欢迎任何形式的贡献！
1. **报告问题**：提交 [GitHub Issue](https://github.com/yeahhe365/All-Model-Chat/issues)。
2. **代码贡献**：Fork 仓库 -> 创建特性分支 -> 提交 Pull Request。
3. **支持作者**：点个 **Star ⭐️** 或前往 [爱发电](https://afdian.com/a/gemini-nexus) 支持持续开发。

---

<div align="center">
  <p>Developed with ❤️ by <strong>从何开始123</strong></p>
  <p>Powered by <strong>Google Gemini 3.0 Ecosystem</strong></p>
</div>
