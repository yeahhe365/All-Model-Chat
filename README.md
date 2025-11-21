<div align="center">
  
  <a href="https://all-model-chat.pages.dev/" target="_blank">
    <img width="100%" src="https://github.com/user-attachments/assets/bb9094cf-abea-4b4b-9514-93978877349c" alt="All Model Chat Screenshot" />
  </a>

  <h1>🤖 All Model Chat</h1>
  
  <p>
    <strong>全能模型聊天 - 专为 Google Gemini API 家族打造的现代化网页应用</strong>
  </p>

  <p>
    <a href="https://ai.studio/apps/drive/1QTVIPSUjPTWHBzCFRBDG0aiGO6GLNwcD" target="_blank">
      <img src="https://img.shields.io/badge/🚀_Google_AI_Studio-Try_Now-4285F4?style=for-the-badge&logo=google" alt="Try in AI Studio">
    </a>
    <a href="https://all-model-chat.pages.dev/" target="_blank">
      <img src="https://img.shields.io/badge/🌍_Online_Demo-Live-success?style=for-the-badge" alt="Online Demo">
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License">
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Vite-⚡-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  </p>

  <p>
    <a href="https://github.com/yeahhe365/All-Model-Chat/issues">报告问题</a>
    &nbsp;·&nbsp;
    <a href="https://github.com/yeahhe365/All-Model-Chat/issues">功能请求</a>
  </p>
</div>

<br/>

**All Model Chat** 是一款功能强大、支持多模态输入的聊天机器人界面，旨在提供与 Google Gemini API 家族无缝交互的极致体验。它集成了动态模型选择、多模态文件输入、流式响应、全面的聊天历史管理以及广泛的自定义选项，为您带来无与伦比的 AI 互动体验。

---

## ✨ 功能亮点

### 🧠 核心 AI 能力
- **🤖 广泛的模型支持**: 原生支持 Gemini 系列 (`2.5 Pro`, `Flash`, `Flash Lite`)、Imagen 系列 (`3.0`, `4.0`) 图像生成模型以及文本转语音 (TTS) 模型。
- **🛠️ 强大的工具集**: 
    - **网页搜索**: 访问实时信息并提供引用来源。
    - **代码执行器**: 执行 Python 代码解决计算与数据分析问题。
    - **URL 上下文**: 读取和理解网页内容。
- **⚙️ 高级控制**: 自定义 `Temperature`、`Top-P` 和系统指令 (System Prompt)。
- **🤔 思考过程**: 可视化模型的中间推理步骤（Thinking Process）。
- **🗣️ 多模态交互**: 支持高精度语音转文本 (STT) 和多音色文本转语音 (TTS)。
- **🎨 画布助手**: 生成交互式 HTML/SVG/ECharts 图表与可视化内容。

### 📁 高级文件处理
- **📎 多格式支持**: 图片、视频、音频、PDF 文档、代码及文本文件。
- **🖐️ 便捷上传**: 支持拖拽、粘贴、文件选择、**拍照**及**录音**。
- **📝 文本创建**: 内置编辑器，即时创建文本文件作为上下文。
- **🖼️ 交互式预览**: 支持图片缩放、HTML 代码全屏预览。

### 💬 极致聊天体验
- **📚 历史记录**: 本地存储 (`IndexedDB`)，支持对话分组、搜索与置顶。
- **🎭 场景管理**: 创建与保存常用的提示词模板（Prompt Templates）。
- **✏️ 消息控制**: 编辑、删除、重试消息，支持分支修改。
- **📥 导出分享**: 将对话导出为 PNG 长图、HTML、TXT 或 JSON 格式。
- **⌨️ 快捷键**: 丰富的键盘快捷键支持，提升操作效率。
- **📱 响应式设计**: 完美适配桌面与移动端，支持 PWA 安装。

---

## 🚀 快速开始

本应用为纯前端应用，直接在浏览器中运行，无需后端服务器。

1.  **打开应用**: 访问 **[all-model-chat.pages.dev](https://all-model-chat.pages.dev/)**
2.  **打开设置**: 点击页面右上角的齿轮图标 (⚙️)。
3.  **配置密钥**: 在“API 配置”中，开启“使用自定义 API 配置”。
4.  **输入 Key**: 填入您的 [Google AI Studio API Key](https://aistudio.google.com/app/apikey)。支持多 Key 轮询。
5.  **开始使用**: 您的密钥仅加密存储在本地浏览器中，安全无忧。

---

## 🛠️ 技术栈

| 领域 | 技术方案 |
| :--- | :--- |
| **核心框架** | React 19, TypeScript |
| **构建工具** | Vite |
| **AI SDK** | `@google/genai` (Google Official SDK) |
| **样式设计** | Tailwind CSS |
| **数据存储** | IndexedDB (Dexie.js) |
| **渲染引擎** | React Markdown, KaTeX (数学公式), Mermaid/Graphviz (图表), Highlight.js (代码) |

---

## 📁 项目结构

```bash
All-Model-Chat/
├── public/                 # 静态资源 (manifest, icons)
├── src/
│   ├── components/         # React UI 组件
│   │   ├── chat/           # 聊天输入与控制区域
│   │   ├── layout/         # 布局容器
│   │   ├── message/        # 消息气泡与内容渲染
│   │   ├── modals/         # 各类弹窗 (设置, 预览等)
│   │   ├── settings/       # 设置面板组件
│   │   ├── shared/         # 通用基础组件
│   │   └── sidebar/        # 历史记录侧边栏
│   ├── constants/          # 应用常量与配置
│   ├── hooks/              # 自定义 React Hooks (业务逻辑核心)
│   ├── services/           # API 服务层 (Gemini, LocalStorage, Logs)
│   ├── utils/              # 工具函数库
│   ├── App.tsx             # 应用入口组件
│   ├── index.tsx           # 挂载点
│   └── types.ts            # TypeScript 类型定义
├── index.html              # HTML 入口
└── README.md
```

---

<div align="center">
  <sub>Made with ❤️ by <a href="https://github.com/yeahhe365">yeahhe365</a></sub>
</div>
