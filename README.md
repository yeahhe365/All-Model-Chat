# All Model Chat

![PixPin_2025-06-27_00-21-54](https://github.com/user-attachments/assets/ec6f5ee9-2d3b-47e3-9fec-49e6602d3d18)

**在线体验：[在 Google AI Studio 试用 All Model Chat](https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%22169U2Al5556WX7bcWYdaPwHvzoAU7PqW_%22%5D,%22action%22:%22open%22,%22userId%22:%22102038139080022776927%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing)**

**作者 LINUXDO 主页：[yeahhe 的个人资料](https://linux.do/u/yeahhe/summary)**

All Model Chat 是一款功能丰富的、基于 React 的聊天机器人界面，专为与 Google Gemini API 的无缝交互而设计。它提供了一系列强大功能，包括动态模型选择、多模态输入（文本、图像、视频、音频）、流式响应、全面的聊天历史管理以及广泛的自定义选项。

## 功能特性

*   **Google Gemini API 集成**：充分利用各种 Gemini 模型的强大能力。
*   **动态模型选择**：可直接从头部或设置中轻松切换可用的 Gemini 模型（例如 Gemini 2.5 Pro, Gemini 2.5 Flash）。
*   **多模态输入**：可向 AI 发送文本、图像（JPEG, PNG, WEBP, GIF, HEIC, HEIF）、文本文件（HTML, TXT, JS, CSS, JSON, XML, MD）、视频文件（MP4, WEBM, MOV 等）和音频文件（MP3, WAV, AAC 等）。
*   **流式与非流式响应**：可在实时流式接收 AI 响应或完整消息接收之间切换。
*   **全面的聊天历史记录**：
    *   会话自动保存到本地存储（`localStorage`）。
    *   通过专用的历史侧边栏浏览、加载和管理过去的聊天会话。
    *   会话根据第一条用户消息或文件自动命名。
*   **丰富的 Markdown 渲染**：
    *   完全支持 GFM (GitHub Flavored Markdown) 格式的消息。
    *   使用 Prism.js 对代码块进行语法高亮。
    *   交互式代码块：
        *   语言检测。
        *   一键复制到剪贴板按钮。
        *   下载代码片段按钮（例如，`.js`, `.html`, `.py` 格式）。
        *   针对 HTML/SVG 代码块的实时 HTML/SVG 预览模态框。
        *   长代码片段可折叠。
    *   通过 KaTeX 支持 LaTeX 数学表达式。
*   **文件处理与预览**：
    *   支持拖放文件上传（应用全局）。
    *   点击上传文件。
    *   已上传图片的预览（可缩放的模态框）。
    *   为其他支持的文件类型（文本、视频、音频）提供图标和详细信息。
    *   文件上传进度指示器。
*   **消息管理**：
    *   编辑您已发送的消息。
    *   删除单条消息（用户或模型的）。
    *   重试失败的模型响应。
    *   将模型消息导出为 PNG 图片或独立的 HTML 文件。
*   **高级 AI 配置**：
    *   调整 Temperature 和 Top-P 参数。
    *   为当前或新聊天配置系统提示（System Prompt）以指导 AI 的行为。
    *   “显示思考过程”功能，可展示模型中间的思考步骤（适用于支持此功能的模型，如 Gemini Flash）。
    *   特殊的 "Canvas 助手" 系统提示，用于生成基于 HTML/SVG 的输出。
*   **自定义与主题**：
    *   提供浅色和深色主题。
    *   主题颜色通过 CSS 变量管理，易于扩展。
    *   可调整基础字体大小以提高可读性。
*   **预加载场景**：
    *   创建、保存和加载预定义的聊天场景。
    *   以 JSON 文件格式导入和导出场景。
    *   包含一个 "解放者 (Liberator)" 示例场景。
*   **用户界面与体验**：
    *   响应式设计，适应各种屏幕尺寸。
    *   直观的控件和清晰的视觉反馈，用于加载状态、错误和操作。
    *   采用 ARIA 属性的可访问性设计。
    *   设置、主题、预加载场景和聊天历史记录持久化存储在 `localStorage` 中，以便离线访问先前数据。
*   **错误处理**：优雅地显示 API 错误和文件处理问题。

## 技术栈

*   **前端库**：React 19
*   **语言**：TypeScript
*   **AI SDK**：`@google/genai` (Google Gemini API)
*   **样式**：
    *   Tailwind CSS (通过 CDN)
    *   用于主题化的自定义 CSS 变量
*   **Markdown 与代码渲染**：
    *   `react-markdown`
    *   `marked`
    *   `DOMPurify`
    *   `highlight.js`
    *   `remark-gfm` (GitHub Flavored Markdown)
    *   `remark-math` & `rehype-katex` (LaTeX 支持)
*   **图标**：Lucide React
*   **图片导出**：`html2canvas`
*   **模块系统**：ES Modules 与 Import Maps (通过 `esm.sh`)

## 开始使用

### 先决条件

*   支持 ES Modules 的现代 Web 浏览器。
*   一个 Google Gemini API 密钥。

### 设置

1.  **克隆仓库**：
    ```bash
    git clone https://github.com/yeahhe365/All-Model-Chat.git
    cd All-Model-Chat
    ```

2.  **API 密钥配置**：
    此应用程序要求 Google Gemini API 密钥在执行环境中以 `process.env.API_KEY` 的形式可用。
    *   **对于像 Google AI Studio (MakerSuite) 这样的平台：**平台通常会从您的用户设置中注入 API 密钥。
    *   **对于本地开发：**您需要确保设置了此环境变量。一种常见的方法是使用一个可以注入环境变量的本地开发服务器，或者在启动文件服务之前在您的 shell 中设置它。
        *   _注意：_ 应用程序代码本身**不会**处理来自 UI 的 API 密钥输入或直接存储它。它严格依赖于 `process.env.API_KEY`。

3.  **运行应用程序**：
    *   由于该应用程序使用 ES Modules并通过 `index.html` 中的 import map 从 CDN 和 `esm.sh` 加载依赖项，您通常只需在浏览器中打开 `index.html` 文件即可运行它。
    *   但是，为了让浏览器中运行的 JavaScript 在没有构建步骤的情况下正确识别 `process.env.API_KEY` 作为环境变量，您可能需要一个简单的本地服务器。如果您有 Node.js，一种方法是使用像 `live-server` 这样的包，并在启动前在终端会话中设置环境变量：
        ```bash
        #类 Unix 系统 (Linux, macOS)
        export API_KEY="YOUR_GEMINI_API_KEY"
        live-server

        # Windows (PowerShell)
        # $env:API_KEY="YOUR_GEMINI_API_KEY"
        # live-server
        ```
        或者，如果直接访问环境变量在没有构建工具的情况下存在问题，您可以使用一个简单的 Node.js/Express 服务器来提供静态文件，并将 API 密钥注入到 `index.html` 中。

## 项目结构

*   `index.html`: 应用程序的主要入口点。设置 import maps 并加载主脚本。
*   `index.tsx`: 初始化 React 应用程序并挂载 `App` 组件。
*   `App.tsx`: 根 React 组件，管理整体状态和布局。
*   `components/`: 包含所有 React UI 组件 (例如 `Header.tsx`, `MessageList.tsx`, `ChatInput.tsx`, `SettingsModal.tsx`)。
*   `services/`: 包含用于与 Gemini API 交互的 `geminiService.ts`。
*   `types.ts`: 定义整个应用程序中使用的 TypeScript 接口和类型。
*   `constants.ts`: 包含默认设置、主题定义、支持的 MIME 类型和其他常量值。
*   `metadata.json`: 项目元数据，包括权限（尽管目前没有请求像摄像头/麦克风这样的权限）。

## 贡献

欢迎贡献！如果您有改进建议或发现任何错误，请随时在 [GitHub 仓库](https://github.com/yeahhe365/All-Model-Chat) 中提交 issue 或 pull request。

1.  Fork 本项目
2.  创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  提交一个 Pull Request

## 许可证

该项目采用 MIT 许可证。有关详细信息，请参阅 `LICENSE` 文件（如果已添加 - 目前假设为 MIT，作为一种常见的开源许可证）。

