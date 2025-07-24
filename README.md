<div align="center">
  <a href="https://all-model-chat.pages.dev/" target="_blank">
    <img width="1920" height="991" alt="All Model Chat 应用界面截图" src="https://github.com/user-attachments/assets/2eca1f8c-ced1-48a8-ab81-dda8f0e2f440" />
  </a>
  <br/>
  <h1>All Model Chat - 全能模型聊天</h1>
  <strong>一款功能丰富、高度可定制的网页聊天应用，专为 Google Gemini API 家族打造。</strong>
  <br/>
  <p>
    <a href="https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%22169U2Al5556WX7bcWYdaPwHvzoAU7PqW_%22%5D,%22action%22:%22open%22,%22userId%22:%22102038139080022776927%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing" target="_blank"><strong>🚀 在 Google AI Studio 中尝试</strong></a>
    &nbsp;&nbsp;•&nbsp;&nbsp;
    <a href="https://all-model-chat.pages.dev/" target="_blank"><strong>🌍 在线体验</strong></a>
    &nbsp;&nbsp;•&nbsp;&nbsp;
    <a href="https://github.com/yeahhe365/All-Model-Chat/issues" target="_blank">报告问题</a>
    &nbsp;&nbsp;•&nbsp;&nbsp;
    <a href="https://github.com/yeahhe365/All-Model-Chat/issues" target="_blank">功能请求</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="许可证">
    <img src="https://img.shields.io/badge/react-19-blue?logo=react" alt="React">
    <img src="https://img.shields.io/badge/typescript-5.5-blue?logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="欢迎提交PR">
  </p>
</div>

---

**All Model Chat** 是一款功能强大、支持多模态输入的聊天机器人界面，旨在提供与 Google Gemini API 家族无缝交互的极致体验。它集成了动态模型选择、多模态文件输入、流式响应、全面的聊天历史管理以及广泛的自定义选项，为您带来无与伦比的 AI 互动体验。

## ✨ 功能亮点

### 核心 AI 能力
- 🤖 **广泛的模型支持**: 原生支持 Gemini 系列 (`2.5 Pro`, `Flash`, `Flash Lite`)、Imagen 系列 (`3.0`, `4.0`) 图像生成模型以及文本转语音 (TTS) 模型。这是一个真正意义上的多模态AI应用平台。
- 🛠️ **强大的工具集**: 无缝集成 Google 的强大工具，增强模型能力：
    - 🌐 **网页搜索**: 允许模型访问实时信息以回答时事问题，并提供引用来源。
    - 💻 **代码执行器**: 让模型能够执行代码来解决计算问题、分析数据。
    - 🔗 **URL 上下文**: 允许模型读取和理解您提供的 URL 内容。
- ⚙️ **高级AI参数控制**: 精确调整 `Temperature` 和 `Top-P` 参数，以控制AI回复的创造性与确定性。您还可以为任意对话设置自定义的**系统指令 (System Prompt)**，从而塑造AI的性格和行为模式。
- 🤔 **展示“思考过程”**: 洞察模型（如 Gemini 2.5 Flash/Pro）在生成回答前的中间思考步骤。此功能非常适合用于调试和理解AI的推理过程，您甚至可以配置“思考预算”来平衡质量与速度。
- 🎙️ **语音转文本 (STT)**: 使用强大的 Gemini 模型将您的语音实时转录为文字输入，准确率远超浏览器标准API。您甚至可以在设置中选择不同的 Gemini 模型用于转录。
- 🔊 **文本转语音 (TTS)**: 将模型的文本回答一键转换为流畅的语音，并提供多种高质量音色供您选择，实现“听”AI的功能。
- 🎨 **画布助手 (Canvas Assistant)**: 一个特别设计的系统指令，能将AI变为一名前端开发助手，生成丰富、可交互的 HTML/SVG 网页内容，例如使用 ECharts 创建图表、使用 Graphviz 生成流程图等。

### 高级文件处理
- 📎 **丰富的文件支持**: 轻松上传和处理多种文件类型，包括**图片**、**视频**、**音频**、**PDF文档**以及各类**代码和文本文件**。
- 🖐️ **多样化的上传方式**: 提供了极致便利的文件上传体验，支持**拖拽**、从剪贴板**粘贴**、使用**文件选择器**，甚至可以直接调用**摄像头拍照**或使用**麦克风录音**。
- ✍️ **即时创建文本文件**: 无需离开应用，即可在应用内快速创建和编辑文本文件，并将其作为上下文提交给模型。
- 🆔 **通过文件ID引用**: 对于高级用户，您可以直接引用已上传到 Gemini API 的文件（使用其 `files/...` ID），无需重复上传，节省时间和带宽。
- 🖼️ **交互式预览**: 在应用内直接缩放和平移您上传的图片，或在交互式模态框中预览AI生成的HTML代码，甚至可以进入真正的全屏模式。
- 📊 **智能文件管理**: 提供实时上传进度条、进行中的上传可随时取消，并有清晰的错误处理提示，确保文件处理过程始终在您的掌控之中。

### 强化的聊天体验
- 📚 **持久化聊天历史**: 所有对话都会自动保存在您的浏览器本地存储 (`localStorage`) 中，确保了数据隐私，并允许您随时回顾过往的交流。
- 📂 **对话分组**: 将您的聊天会话整理到可折叠的群组中，便于管理和查找。
- 🎭 **场景管理**: 创建、保存、导入和导出“聊天模板”。这使得您可以快速设定复杂的对话背景（如编程问题、角色扮演），极大提升了沟通效率。
- ✏️ **完全的消息控制**: 您可以**编辑**、**删除**或**重试**任何一条消息。智能编辑功能（编辑用户提示）会自动从该点截断并重新提交对话，从而正确地维持上下文。
- 📥 **导出对话与消息**: 将整个对话导出为 **PNG 图片**、**HTML 文件** 或 **TXT 文件**。您还可以将单条模型回复单独导出为 PNG 或 HTML。
- ⌨️ **键盘快捷键**: 专为效率爱好者设计，提供新建对话、切换模型、打开日志等多种快捷键，让操作行云流水。
- 🛠️ **日志查看器与调试工具**: 内置的日志查看器让高级用户可以洞察应用的内部行为、API调用详情以及API密钥的使用情况（当提供多个密钥时）。

## 🚀 快速开始

本应用旨在浏览器中直接使用，无需任何后端或安装配置。

1.  **打开应用**: 访问 **[all-model-chat.pages.dev](https://all-model-chat.pages.dev/)**。
2.  **打开设置**: 点击页面右上角的齿轮图标 (⚙️)。
3.  **启用自定义配置**: 在“API 配置”部分，打开“使用自定义 API 配置”的开关。
4.  **输入您的 API 密钥**: 将您的 Google Gemini API 密钥粘贴到文本框中。您可以从 **[Google AI Studio](https://aistudio.google.com/app/apikey)** 获取密钥。支持每行输入一个，以使用多个密钥轮换。
5.  **保存并开始聊天**: 点击“保存”。您的密钥将安全地存储在您浏览器的 `localStorage` 中，绝不会发送到任何其他地方。

## 🛠️ 技术栈

*   **框架**: React 19 & TypeScript
*   **AI SDK**: `@google/genai`
*   **样式**: Tailwind CSS (通过 CDN) & CSS 变量（用于主题化）
*   **Markdown 与渲染**: `react-markdown`, `remark-gfm`, `remark-math`, `rehype-highlight`, `rehype-katex`, `highlight.js`, `DOMPurify`, `mermaid`, `viz.js`
*   **图片导出**: `html2canvas`
*   **模块加载**: 现代 ES 模块 & Import Maps (通过 `esm.sh`)
*   **图标**: Lucide React
*   **离线支持**: Service Worker (`sw.js`) 用于缓存应用外壳

## 📁 项目结构

```
All-Model-Chat/
├── public/                 # 静态资源 (manifest.json, sw.js)
├── src/
│   ├── components/         # React UI 组件 (头部, 聊天输入, 模态框等)
│   │   ├── chat/           # 聊天输入子组件
│   │   ├── layout/         # 布局组件
│   │   ├── message/        # 消息渲染子组件 (代码块, 图表)
│   │   ├── modals/         # 应用级模态框
│   │   ├── shared/         # 可复用的通用组件
│   │   └── settings/       # 设置面板模块
│   ├── constants/          # 应用全局常量 (app, 主题, 文件, 模型)
│   ├── hooks/              # ✨ 应用核心逻辑所在地
│   │   ├── useChat.ts      # 组织所有功能的主 Hook
│   │   ├── useAppSettings.ts # 管理全局设置、主题和语言
│   │   └── ... (其他自定义 Hooks)
│   ├── services/           # 外部服务封装
│   │   ├── api/            # 模块化的 API 调用函数
│   │   ├── geminiService.ts# 封装所有对 Google GenAI API 的调用
│   │   └── logService.ts   # 为日志查看器提供应用内日志服务
│   ├── utils/              # 工具函数
│   │   ├── translations/   # 语言翻译文件
│   │   └── ... (API, 领域, UI 相关的工具函数)
│   ├── App.tsx             # 应用根组件
│   ├── index.tsx           # React 应用入口文件
│   └── types.ts            # 核心 TypeScript 类型定义
│ 
├── index.html              # 主 HTML 文件，包含 import maps 和核心样式
└── README.md
```

## 🤝 参与贡献

欢迎各种形式的贡献！如果您有任何改进建议或发现了错误，请随时提交 [Issue](https://github.com/yeahhe365/All-Model-Chat/issues) 或 Pull Request。

1.  Fork 本项目。
2.  创建您的功能分支 (`git checkout -b feature/AmazingFeature`)。
3.  提交您的更改 (`git commit -m 'Add some AmazingFeature'`)。
4.  将分支推送到远程 (`git push origin feature/AmazingFeature`)。
5.  开启一个 Pull Request。

## 📄 开源协议

本项目基于 MIT 许可证。详情请见 `LICENSE` 文件。
