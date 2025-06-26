
# All Model Chat

![PixPin_2025-06-27_00-21-54](https://github.com/user-attachments/assets/ec6f5ee9-2d3b-47e3-9fec-49e6602d3d18)

**在线体验：**
*   **[在 Google AI Studio 试用 All Model Chat](https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%22169U2Al5556WX7bcWYdaPwHvzoAU7PqW_%22%5D,%22action%22:%22open%22,%22userId%22:%22102038139080022776927%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing)**
*   **[Cloudflare Pages 版本 Demo](https://all-model-chat.pages.dev/)**

**作者 LINUXDO 主页：[yeahhe 的个人资料](https://linux.do/u/yeahhe/summary)**

All Model Chat 是一款功能丰富的、基于 React 的聊天机器人界面，专为与 Google Gemini API 的无缝交互而设计。它提供了一系列强大功能，包括动态模型选择、多模态输入（文本、图像、视频、音频、PDF、自定义文本文件）、流式响应、全面的聊天历史管理、高级 AI 配置、丰富的 Markdown 渲染以及广泛的自定义选项。

## 功能特性

本项目致力于提供一个强大、灵活且用户友好的 AI 聊天体验：

### 核心 AI 交互
*   **Google Gemini API 集成**：充分利用各种 Gemini 模型的强大能力，包括 Gemini 2.5 Pro 和 Gemini 2.5 Flash 等。
*   **动态模型选择**：可直接从头部或设置中轻松切换可用的 Gemini 模型。
*   **流式与非流式响应**：可在实时流式接收 AI 响应或完整消息接收之间切换，满足不同场景需求。
*   **高级 AI 配置**：
    *   调整 `Temperature`（生成文本的随机性）和 `Top-P`（控制词语选择多样性）参数。
    *   为当前或新聊天配置**系统提示（System Prompt）**以指导 AI 的行为。
    *   **“显示思考过程”**功能，可展示模型中间的思考步骤（适用于支持此功能的模型，如 Gemini Flash）。
    *   特殊的 **"Canvas 助手" 系统提示**：一键加载预设的系统提示，指导模型生成基于 HTML/SVG 的可视化输出，便于在线预览。

### 多模态输入与文件处理
*   **多模态输入**：可向 AI 发送多种类型的文件：
    *   **图像文件**：JPEG, PNG, WEBP, GIF, HEIC, HEIF。
    *   **文本文件**：HTML, TXT, JS, CSS, JSON, XML, MD (Markdown)。
    *   **视频文件**：MP4, WEBM, MOV, MPEG, OGG, AVI, MKV, FLV。
    *   **音频文件**：MP3, WAV, AAC, OGG, WEBM, FLAC, MP4。
    *   **PDF 文件**：上传 PDF 文档进行分析。
*   **灵活的文件上传方式**：
    *   **拖放上传**：将文件直接拖放到应用界面内即可上传。
    *   **点击上传**：通过文件选择器上传。
    *   **按文件 ID 添加**：直接输入 Gemini API 文件服务返回的 `files/your_file_id` 来添加已上传的文件。
    *   **创建自定义文本文件**：在应用内直接编辑并创建文本文件作为输入。
*   **文件处理与预览**：
    *   已上传图片的**预览功能**（可缩放的模态框）。
    *   为其他支持的文件类型（文本、视频、音频、PDF）提供清晰的图标和详细信息。
    *   文件上传进度指示器。
    *   支持复制已成功上传文件的 Gemini API `fileApiName`。

### 聊天历史与场景管理
*   **全面的聊天历史记录**：
    *   所有会话自动保存到本地存储（`localStorage`）。
    *   通过专用的**历史侧边栏**浏览、加载和管理过去的聊天会话。
    *   会话根据第一条用户消息或文件自动命名。
    *   支持删除历史会话。
*   **预加载场景**：
    *   创建、保存和加载预定义的聊天场景（即一系列消息对话）。
    *   以 JSON 文件格式导入和导出场景，方便分享和备份。
    *   包含一个 **"解放者 (Liberator)" 示例场景**，一键加载即可体验。

### 消息管理与内容渲染
*   **消息管理**：
    *   **编辑**您已发送的用户消息（编辑后会重新发起请求）。
    *   删除单条消息（用户或模型的）。
    *   **重试**失败的模型响应。
    *   将模型消息导出为 **PNG 图片**或独立的 **HTML 文件**，便于分享或存档。
*   **丰富的 Markdown 渲染**：
    *   完全支持 GFM (GitHub Flavored Markdown) 格式的消息。
    *   使用 `rehype-highlight` 对代码块进行语法高亮。
    *   交互式代码块：
        *   **语言检测**：自动识别代码语言。
        *   **一键复制**：一键复制代码到剪贴板按钮。
        *   **下载代码片段**：支持将代码片段下载为对应语言文件（例如，`.js`, `.html`, `.py` 格式）。
        *   **实时 HTML/SVG 预览**：针对 HTML/SVG 代码块，提供模态框或浏览器全屏的实时预览功能。
        *   **长代码片段可折叠**：提高可读性。
    *   通过 KaTeX 支持 **LaTeX 数学表达式**。

### 用户界面与体验
*   **响应式设计**：适应各种屏幕尺寸，从手机到桌面端。
*   **直观的控件和清晰的视觉反馈**：加载状态、错误提示、操作确认一目了然。
*   采用 ARIA 属性的可访问性设计。
*   **自定义与主题**：
    *   提供**浅色和深色主题**，并通过 CSS 变量管理，易于扩展。
    *   可调整**基础字体大小**以提高可读性。
*   **性能指标**：显示 AI 响应时间及**Token 使用量（输入、输出、累计总量）**。
*   **键盘快捷键**：
    *   `Ctrl/Cmd + Alt + N`: 快速开始新聊天。
    *   `Delete` (在聊天输入框为空或无焦点时): 清空当前聊天。
    *   `Tab` (在聊天输入框或无焦点时): 快速切换常用 AI 模型。
*   **持久化存储**：设置、主题、预加载场景和聊天历史记录持久存储在 `localStorage` 中，以便离线访问先前数据。
*   **错误处理**：优雅地显示 API 错误和文件处理问题。

## 技术栈

*   **前端框架**：React 19 (使用 `react-dom@^19.1.0`)
*   **语言**：TypeScript
*   **AI SDK**：`@google/genai` (Google Gemini API)
*   **构建工具**：Vite
*   **样式**：
    *   Tailwind CSS (通过 CDN)
    *   用于主题化的自定义 CSS 变量
*   **Markdown 与代码渲染**：
    *   `react-markdown`：React 组件，用于渲染 Markdown。
    *   `remark-gfm`：支持 GitHub Flavored Markdown (GFM)。
    *   `remark-math` & `rehype-katex`：用于渲染 LaTeX 数学公式。
    *   `rehype-highlight`：集成代码语法高亮。
    *   `marked`：用于非 ReactMarkdown 场景的 Markdown 解析（例如导出）。
    *   `DOMPurify`：用于 HTML 内容净化，防止 XSS 攻击。
*   **图标**：Lucide React
*   **图片导出**：`html2canvas`
*   **模块系统**：ES Modules 与 Import Maps (通过 `esm.sh`)

## 开始使用

### 先决条件

*   支持 ES Modules 的现代 Web 浏览器。
*   一个 Google Gemini API 密钥。
*   安装 Node.js 和 npm/yarn/pnpm。

### 设置

1.  **克隆仓库**：
    ```bash
    git clone https://github.com/yeahhe365/All-Model-Chat.git
    cd All-Model-Chat
    ```

2.  **安装依赖**：
    ```bash
    npm install
    # 或者 yarn install
    # 或者 pnpm install
    ```

3.  **API 密钥配置**：
    该应用程序通过环境变量获取 Google Gemini API 密钥。请在项目根目录创建或编辑 `.env.local` 文件，并添加您的 API 密钥：
    ```
    # .env.local
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```
    *注意：* 出于安全考虑，此应用程序**不会**在用户界面中提供 API 密钥输入框或直接存储密钥。它严格依赖于构建或运行环境注入的环境变量 (`process.env.API_KEY` 或 `process.env.GEMINI_API_KEY`)。

4.  **运行应用程序**：
    在开发模式下，Vite 会自动加载 `.env.local` 文件中的环境变量。
    ```bash
    npm run dev
    # 或者 yarn dev
    # 或者 pnpm dev
    ```
    这将在本地启动一个开发服务器（通常在 `http://localhost:5173` 或类似端口）。在浏览器中打开此 URL 即可使用应用程序。

## 项目结构

```
all-model-chat/
├── components/                 # 所有 React UI 组件 (Header, ChatInput, MessageList, Modals等)
│   ├── ChatInput.tsx           # 聊天输入框，文件上传及管理
│   ├── Header.tsx              # 应用顶部导航栏，模型选择，设置入口
│   ├── HistorySidebar.tsx      # 聊天历史侧边栏
│   ├── HtmlPreviewModal.tsx    # HTML/SVG 代码预览模态框
│   ├── MessageList.tsx         # 消息列表渲染，Markdown, 代码高亮，文件显示
│   ├── PreloadedMessagesModal.tsx # 预加载场景管理模态框
│   ├── SettingsModal.tsx       # 应用及聊天设置模态框
│   └── SystemMessageModal.tsx  # 系统提示编辑模态框 (内部组件，未在README中单独列出)
├── services/                   # 与 Gemini API 交互的服务层
│   └── geminiService.ts        # 封装 Gemini API 调用，包括聊天和文件上传
├── .env.local                  # 环境变量配置文件 (存放 GEMINI_API_KEY)
├── .gitignore                  # Git 忽略文件配置
├── App.tsx                     # 根 React 组件，管理全局状态和应用逻辑
├── constants.ts                # 应用常量，包括默认设置、主题、MIME类型、特定系统提示
├── index.html                  # 应用程序 HTML 入口文件，加载 CDN 资源和 JS 模块
├── index.tsx                   # React 应用的入口点，挂载 App 组件
├── metadata.json               # 项目元数据 (Google AI Studio相关)
├── package.json                # 项目依赖和脚本配置
├── README.md                   # 项目说明文档
├── tsconfig.json               # TypeScript 编译配置
├── types.ts                    # TypeScript 类型定义和接口
└── vite.config.ts              # Vite 构建工具配置
```

## 贡献

欢迎贡献！如果您有改进建议或发现任何错误，请随时在 [GitHub 仓库](https://github.com/yeahhe365/All-Model-Chat) 中提交 issue 或 pull request。

1.  Fork 本项目
2.  创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  提交一个 Pull Request

## 许可证

该项目采用 MIT 许可证。有关详细信息，请参阅 `LICENSE` 文件
