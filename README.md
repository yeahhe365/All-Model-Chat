
<div align="center">
  <a href="https://all-model-chat.pages.dev/" target="_blank">
    <img src="https://github.com/user-attachments/assets/0e1d421b-7ce2-4bc7-a43f-3bc5b02102dc" alt="All Model Chat 界面截图" width="85%"/>
  </a>
  <h1>All Model Chat - 全能模型聊天</h1>
  <p><strong>一款功能丰富、高度可定制的网页聊天应用，专为 Google Gemini API 打造。</strong></p>
  <p>
    <a href="https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%22169U2Al5556WX7bcWYdaPwHvzoAU7PqW_%22%5D,%22action%22:%22open%22,%22userId%22:%22102038139080022776927%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing" target="_blank"><strong>🚀 在 Google AI Studio 试用</strong></a>
    &nbsp;&nbsp;•&nbsp;&nbsp;
    <a href="https://all-model-chat.pages.dev/" target="_blank"><strong>🌍 Cloudflare Pages Demo</strong></a>
    &nbsp;&nbsp;•&nbsp;&nbsp;
    <a href="https://linux.do/u/yeahhe/summary" target="_blank"><strong>👨‍💻 作者 LINUXDO 主页</strong></a>
  </p>
</div>

---

**All Model Chat** 是一款功能强大、支持多模态输入的聊天机器人界面，旨在提供与 Google Gemini API 家族（包括 `Gemini 2.5 Pro`、`Imagen 3`、`Veo 2` 和 TTS 模型）无缝交互的极致体验。它集成了动态模型选择、多模态文件输入、流式响应、全面的聊天历史管理、高级 AI 配置、丰富的 Markdown 渲染以及广泛的自定义选项，为您带来前所未有的 AI 交互体验。

## ✨ 功能亮点

### 🤖 核心 AI 能力
*   **广泛模型支持**: 原生支持 Gemini 文本模型 (`gemini-2.5-pro`, `gemini-2.5-flash`), 图像生成模型 (`imagen-3.0`), 视频生成模型 (`veo-2.0`), 以及文本转语音 (TTS) 模型。
*   **动态模型选择**: 可在应用头部或设置中轻松切换所有可用的 Gemini 模型。
*   **流式与非流式响应**: 可在实时流式接收 AI 响应或一次性接收完整消息之间自由切换。
*   **高级 AI 配置**:
    *   ⚙️ 调整 `Temperature` (随机性) 和 `Top-P` (多样性) 参数。
    *   🎭 为任意对话配置专属的**系统提示 (System Prompt)**，引导 AI 的行为和角色。
    *   🤔 **“显示思考过程”**: 查看模型（如 Gemini 2.5 Flash）在生成回答时的中间思考步骤，并可配置思考预算。
    *   🎙️ **语音输入转录**: 使用 Gemini 模型直接在聊天框中转录您的语音输入，并可为其单独选择模型。
    *   🔊 **文本转语音 (TTS)**: 将模型的文本回答通过多种内置语音朗读出来。
    *   🎨 **Canvas 助手**: 一键加载预设的系统提示，指导模型生成丰富、可交互的 HTML/SVG 可视化输出。

### 📎 多模态输入与文件处理
*   **丰富的文件支持**: 上传文件，与 AI 一同“阅读”：
    *   🖼️ **图像**: `JPEG`, `PNG`, `WEBP`, `GIF`, `HEIC`, `HEIF`
    *   🎬 **视频**: `MP4`, `WebM`, `MOV`, `MPEG`, `OGG`, `AVI`, `MKV`, `FLV`
    *   🎵 **音频**: `MP3`, `WAV`, `AAC`, `OGG`, `WEBM`, `FLAC`, `MP4`
    *   📄 **文档**: `PDF`, `HTML`, `TXT`, `JS`, `CSS`, `JSON`, `XML`, `MD`
*   **灵活的上传方式**:
    *   🖐️ **拖放上传**: 将文件直接拖入应用窗口。
    *   📋 **粘贴上传**: 从剪贴板粘贴文件。
    *   👆 **文件选择器**: 使用传统方式从设备上传。
    *   📸 **拍照上传**: 直接使用设备摄像头拍照。
    *   🎤 **录音上传**: 使用麦克风录制音频。
    *   ✍️ **创建文本文件**: 即时编辑并创建文本文件作为输入。
    *   🆔 **按文件 ID 添加**: 通过 Gemini API 的 `files/...` ID 引用已上传的文件。
*   **智能文件管理**:
    *   📊 实时上传与处理进度条。
    *   ❌ 可取消正在进行的上传任务。
    *   🚨 清晰的错误处理机制。
    *   🔎 支持缩放和平移的交互式图片预览。
    *   🔗 可一键复制成功上传文件的 `fileApiName`。

### 📚 聊天历史与场景管理
*   **持久化聊天历史**: 所有对话都将自动保存到浏览器的本地存储 (`localStorage`) 中。
*   **历史侧边栏**: 方便地浏览、加载和删除过去的对话。会话将根据首条消息自动生成标题。
*   **预加载场景**: 创建、保存和加载预设的对话模板，快速设置特定聊天背景。
*   **导入/导出场景**: 以 JSON 文件格式分享或备份您的场景。内置一个“解放者”场景供您体验。

### 🎨 消息渲染与内容管理
*   **完全消息控制**:
    *   ✏️ **编辑**已发送的用户消息（编辑后将从该点重新发起请求）。
    *   🗑️ **删除**对话中的任意消息。
    *   🔁 **重试**失败或不满意的模型响应。
    *   🖼️ 将模型回答导出为高清 **PNG 图片**或独立的 **HTML 文件**。
*   **丰富的 Markdown 渲染**:
    *   💯 全面支持 GFM (GitHub Flavored Markdown)，包括表格、列表等。
    *   🧮 通过 KaTeX 完美渲染 LaTeX 数学公式。
    *   **</> 交互式代码块**:
        *   🌈 通过 `highlight.js` 支持数十种语言的语法高亮。
        *   📋 一键**复制**按钮。
        *   💾 **下载**代码片段为文件 (例如, `.js`, `.py`)。
        *   🌐 在模态框或浏览器全屏中实时**预览 HTML/SVG**。
        *   🔽 长代码块可折叠，保持界面清爽。

### 💻 UI/UX 与个性化
*   **主题切换**: 内置精美的**亮色**与**暗色**主题。
*   **个性化设置**: 调整基础字号以适应您的阅读习惯，并选择显示语言（中文/英文/跟随系统）。
*   **响应式设计**: 在桌面、平板和手机上均有完美的显示效果。
*   **性能指标**: 显示 AI 响应时间及 Token 使用量（输入、输出、累计）。
*   **键盘快捷键**:
    *   `Ctrl/Cmd + Alt + N`: 开始新聊天。
    *   `Delete`: 清空当前聊天（当输入框为空时）。
    *   `Tab`: 循环切换固定的核心模型。
*   **离线支持**: 通过 Service Worker 缓存应用核心文件，即使离线也可访问 UI 和历史数据。

## 🔧 技术栈

*   **⚛️ 前端框架**: React 19
*   **🌐 编程语言**: TypeScript
*   **🧠 AI SDK**: `@google/genai`
*   **🎨 样式方案**: Tailwind CSS (通过 CDN) & CSS 变量 (用于主题化)
*   **📝 Markdown 与代码渲染**: `react-markdown`, `remark-gfm`, `remark-math`, `rehype-highlight`, `rehype-katex`, `highlight.js`, `DOMPurify`, `marked`
*   **🖼️ 图片导出**: `html2canvas`
*   **📦 模块加载**: ES Modules & Import Maps (via `esm.sh`)
*   **📱 图标库**: Lucide React

## 🚀 快速开始

### 先决条件
*   一个现代浏览器 (如 Chrome, Firefox, Edge, Safari)。
*   一个 Google Gemini API 密钥。您可以从 **[Google AI Studio](https://aistudio.google.com/app/apikey)** 获取。

### 配置指南 (推荐)
本应用设计为开箱即用，推荐直接在应用内配置您的 API 密钥。

1.  **打开应用**: 在浏览器中启动应用。
2.  **进入设置**: 点击右上角的齿轮图标 (⚙️) 打开设置面板。
3.  **启用自定义配置**: 在“API 配置”部分，打开“使用自定义 API 配置”的开关。
4.  **输入密钥**: 将您的 Google Gemini API 密钥粘贴到输入框中。您可以输入多个密钥（每行一个），应用将在每次新会话时随机选择一个使用。
5.  **保存设置**: 点击“保存”按钮。您的密钥将安全地存储在浏览器的 `localStorage` 中，仅供本应用在本机访问。

### 本地开发 (可选)
如果您想在本地进行开发或修改：

1.  **克隆仓库**:
    ```bash
    git clone https://github.com/yeahhe365/All-Model-Chat.git
    cd All-Model-Chat
    ```

2.  **安装依赖**:
    ```bash
    npm install
    ```

3.  **配置 API 密钥**:
    在项目根目录创建一个 `.env` 文件，并添加您的密钥：
    ```
    VITE_API_KEY="YOUR_GEMINI_API_KEY"
    ```
    *注意：Vite 配置会将 `VITE_API_KEY` 暴露为 `process.env.API_KEY`。如果同时在应用内设置了密钥，应用内设置的优先级更高。*

4.  **启动开发服务器**:
    ```bash
    npm run dev
    ```
    在浏览器中打开 `http://localhost:5173` (或命令行提示的地址)。

## 📁 项目结构

```
all-model-chat/
├── public/                 # 静态资源 (如 favicon.png, manifest.json, sw.js)
├── src/
│   ├── components/         # 所有的 React UI 组件
│   │   ├── chat/           # 聊天输入区相关子组件 (文件预览, 摄像头, 录音机)
│   │   ├── message/        # 单条消息渲染相关子组件 (代码块, 文件展示)
│   │   ├── settings/       # 设置面板相关子组件 (API, 外观, 行为)
│   │   ├── ChatInput.tsx   # 聊天输入框，文件上传等核心交互区
│   │   ├── Header.tsx      # 应用顶部导航栏
│   │   ├── MessageList.tsx # 消息列表渲染
│   │   └── ...             # 其他模态框和侧边栏组件
│   ├── constants/          # 应用常量 (默认设置, 主题, 文件类型, 提示词)
│   ├── hooks/              # 自定义 React Hooks (核心逻辑)
│   │   ├── useChat.ts      # ✨ 主 Hook，负责编排所有聊天功能
│   │   ├── useAppSettings.ts # 管理全局设置、主题和语言
│   │   ├── useChatHistory.ts # 处理聊天会话的加载与保存
│   │   ├── useMessageHandler.ts # 封装消息发送、重试、删除等逻辑
│   │   └── ...
│   ├── services/           # 外部 API 服务层
│   │   └── geminiService.ts# 封装所有 Gemini API 调用
│   ├── utils/              # 工具函数 (翻译, ID生成, 格式化等)
│   ├── App.tsx             # 应用根组件，整合所有部分
│   ├── index.tsx           # React 应用入口点
│   └── types.ts            # TypeScript 类型定义
│ 
├── index.html              # 主 HTML 文件，包含 import maps 和核心样式
├── README.md               # 本说明文档
└── ... (其他配置文件如 vite.config.ts, tsconfig.json)
```

## 🤝 参与贡献

欢迎各种形式的贡献！如果您有改进建议或发现了 Bug，请随时在 [GitHub 仓库](https://github.com/yeahhe365/All-Model-Chat) 中提交 Issue 或 Pull Request。

1.  Fork 本项目
2.  创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  提交一个 Pull Request

## 📄 开源协议

该项目采用 MIT 许可证。详情请参阅 `LICENSE` 文件。
