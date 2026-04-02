# All Model Chat

<div align="center">

  <p>
    <strong>基于 Google Gemini API 的全能 AI 交互工作台</strong>
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
    <img src="https://img.shields.io/badge/Gemini_SDK-1.2+-8E75B2?style=flat-square&logo=google&logoColor=white" alt="Gemini SDK">
    <img src="https://img.shields.io/badge/PWA-Supported-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA">
  </p>

</div>

---

## 项目简介

**All Model Chat** 是一款基于 React 18 的 AI 交互工作台，深度集成 Google Gemini 系列模型。项目坚持 **Local-First** 原则：所有数据存储于浏览器 IndexedDB，无需后端服务器，在保障隐私的同时提供流畅的原生级体验。

支持两种运行模式：
- **标准模式**：克隆仓库后通过 Vite 开发/构建，传统 SPA 部署
- **零构建模式**：利用 HTML import map 直接在浏览器中加载依赖，可在 Google AI Studio 中一键运行

---

## 核心功能

### 深度推理 (Thinking)
- 支持 Gemini 3.0 / 3.1 / 2.5 系列模型的思维链可视化
- 可设置 **Token 预算** 或 **推理等级** (Minimal / Low / Medium / High)
- 实时查看 AI 的逻辑演算过程

### 实时音视频 (Live API)
- 双向实时流式交互，支持语音通话
- 屏幕共享与视觉识别
- 音频可视化 (AudioWorklet API)

### 智能 Canvas
- 代码块自动识别并渲染为交互式 HTML 预览（自动全屏）
- 支持 ECharts 图表渲染
- 支持 Mermaid 流程图与 Graphviz 图渲染
- 自动 Canvas 生成模式（可配置触发模型）

### 高级文件处理
- 客户端音频转码压缩（16kHz MP3），节省 Token 消耗
- 支持 ZIP / 文件夹拖入，自动解析代码库结构
- 支持图片、PDF、视频、音频、文本等多种文件类型
- 可配置各文件类型使用 Gemini Files API 还是直接 Base64 上传
- 文件分辨率可调（Low / Medium / High / Ultra）

### 生产力工具链
- **深度搜索**：聚合 Google Search，自动规划搜索任务并提供精准引用
- **URL 上下文**：自动抓取 URL 内容作为对话上下文
- **本地 Python 沙箱**：基于 Pyodide (WASM) 的浏览器端 Python 运行环境
  - 预装 numpy、pandas、matplotlib、scipy、scikit-learn 等科学计算库
  - 自动检测代码依赖并安装
  - 支持文件挂载与生成文件下载
  - matplotlib 图表自动捕获输出
- **TTS 语音合成**：30+ 种语音可选
- **语音转录**：支持多种 Gemini 模型进行语音转文字
- **Imagen 4.0 图片生成**：支持 Fast / Standard / Ultra 三档，可配置宽高比与尺寸

### 企业级 API 管理
- **多 Key 轮询**：支持填入多个 API Key 自动分担压力
- **API 代理**：内置 Network Interceptor（Fetch 拦截），动态重写请求路径
- **Vertex AI 兼容**：原生支持 Vertex AI Express 端点，自动修复路径映射

### 多语言界面
- 支持中文 / 英文 / 跟随系统三种语言设置
- 覆盖所有 UI 组件（聊天、设置、侧边栏、快捷键等）

### PWA 支持
- Service Worker 离线缓存，动态 App Shell 发现
- 可安装为桌面/移动端应用
- 支持画中画 (Picture-in-Picture) 模式

### 多标签同步
- 基于 Web Locks API 的跨标签页数据同步
- 确保多标签页同时操作时数据一致性

### 自定义快捷键
- 内置快捷键系统，支持新建聊天、打开日志、切换模型、画中画等操作
- 所有快捷键均可自定义覆盖

### 安全设置
- 5 个安全过滤类别：骚扰、仇恨言论、色情内容、危险内容、公民诚信
- 每个类别可独立配置过滤级别（OFF / None / High / Medium / Low）

### 主题系统
- 内置 Onyx（暗色）、Pearl（亮色）主题
- 支持跟随系统主题自动切换

### 数据管理
- 完整的聊天记录导入 / 导出
- 会话分组管理
- 会话搜索（标题 + 内容全文搜索）
- 开发者日志面板（API 调用监控、Token 用量统计）

---

## 快速开始

### 方式一：标准开发模式

```bash
# 克隆仓库
git clone https://github.com/yeahhe365/All-Model-Chat.git
cd All-Model-Chat

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:5173`，在 **设置 -> API 配置** 中填入你的 Gemini API Key。

### 方式二：Google AI Studio（零构建）

直接在 [Google AI Studio](https://ai.studio/apps/drive/1Y2timylzWs4cngOe85xjpD3vO0eznyAX?fullscreenApplet=true) 中打开，所有依赖通过 CDN 加载，无需任何本地配置。

### 配置密钥

除了在界面中手动配置，也可在根目录创建 `.env.local`：

```bash
GEMINI_API_KEY=your_api_key_here
```

### 构建部署

```bash
npm run build    # 构建生产版本
npm run preview  # 本地预览构建结果
```

---

## 技术架构

| 层级 | 技术栈 |
| :--- | :--- |
| **核心框架** | React 18 + TypeScript 5.5 + Vite 5 |
| **样式方案** | Tailwind CSS 3.4 (CDN) + CSS 变量主题系统 |
| **持久化层** | 原生 IndexedDB（db.ts 封装），支持 Web Locks 跨标签写锁 |
| **Gemini SDK** | @google/genai 1.2+，含流式 / 非流式消息、文件上传、图片生成、TTS、转录 |
| **音频引擎** | AudioWorklet API (实时流处理) + Lamejs (MP3 压缩) |
| **渲染引擎** | React-Markdown + KaTeX (公式) + Highlight.js (代码高亮) + Mermaid.js + Graphviz (viz.js) |
| **Python 沙箱** | Pyodide (WASM)，Web Worker 内执行，预装科学计算库 |
| **网络拦截** | 自定义 Fetch Interceptor，动态重写 SDK 请求路径以兼容代理与 Vertex AI |
| **PWA** | Service Worker + Web App Manifest，动态 App Shell 缓存 |
| **双模式部署** | 传统 Vite 构建 / HTML import map 零构建 CDN 加载 |

### 双模式架构说明

项目通过 `index.html` 中的 `<script type="importmap">` 实现双模式运行：

- **Vite 模式**：`vite.config.ts` 将 React、react-pdf 等标记为 `external`，由 Vite 处理打包
- **零构建模式**：import map 直接指向 esm.sh CDN，浏览器原生解析模块依赖，适合 Google AI Studio 等不支持构建的环境

---

## 项目结构

```
All-Model-Chat/
├── components/                 # UI 组件
│   ├── chat/                   # 聊天核心
│   │   ├── input/              # 输入区域（文本框、工具栏、文件选择、Slash 命令、Live 状态）
│   │   │   ├── actions/        # 操作按钮（发送、录音、Live 控制、搜索切换）
│   │   │   ├── area/           # 输入框本体（文本域、文件预览、引用显示、建议）
│   │   │   └── toolbar/        # 工具栏（URL 添加、图片尺寸、宽高比、分辨率、TTS 语音）
│   │   ├── message-list/       # 消息列表（滚动导航、文本选择工具栏、欢迎页）
│   │   └── overlays/           # 覆盖层（拖拽上传、错误提示）
│   ├── header/                 # 头部（模型选择器）
│   ├── icons/                  # 图标库（自定义 SVG 图标、图标工具函数）
│   ├── layout/                 # 布局（主内容区、聊天区域、侧面板、画中画占位）
│   ├── log-viewer/             # 开发者日志面板（API 调用、Token 统计、控制台）
│   ├── message/                # 消息渲染
│   │   ├── blocks/             # 内容块（代码块、Mermaid、Graphviz、表格、工具结果）
│   │   ├── buttons/            # 消息操作按钮（复制、导出）
│   │   ├── content/            # 消息内容区（文本、文件、思考过程、Footer）
│   │   └── grounded-response/  # 搜索引用（来源 URL、搜索查询、上下文）
│   ├── modals/                 # 弹窗集合（HTML 预览、Token 计数、文件配置、音频录制、导出、文本编辑器）
│   ├── recorder/               # 录音器（音频可视化、控制面板）
│   ├── scenarios/              # 场景编辑器（预置消息、系统提示词编辑）
│   ├── settings/               # 设置面板
│   │   ├── controls/           # 控件（模型选择器、思维链控制、语音控制）
│   │   └── sections/           # 设置分区（API 配置、外观、聊天行为、数据管理、安全、快捷键、关于）
│   ├── shared/                 # 共享组件（Modal、代码编辑器、PDF 查看器、音频播放器、Toggle、Select）
│   └── sidebar/                # 侧边栏（历史记录、分组管理、会话操作）
├── constants/                  # 常量定义
│   ├── prompts/                # Canvas 生成提示词、深度搜索提示词
│   ├── scenarios/              # 预置场景（冒险、演示、越狱、工具）
│   ├── appConstants.ts         # 应用级常量（默认设置、UI 样式类名）
│   ├── modelConstants.ts       # 模型常量（默认模型、思维等级、TTS 语音列表、Imagen 模型）
│   ├── promptConstants.ts      # 系统提示词（Python 沙箱、目标检测、引导标注）
│   ├── shortcuts.ts            # 快捷键注册表
│   └── themeConstants.ts       # 主题颜色定义
├── contexts/                   # React Context
│   └── WindowContext.tsx        # 窗口上下文（画中画窗口管理）
├── hooks/                      # React Hooks（逻辑层）
│   ├── app/                    # 应用层（初始化、事件处理、Props 编排）
│   ├── chat-input/             # 输入逻辑（键盘处理、文件管理、提交、粘贴）
│   ├── chat-stream/            # 流式处理（处理器、工具函数）
│   ├── chat/                   # 聊天核心（消息操作、会话管理、自动标题、建议）
│   │   ├── actions/            # 聊天动作（音频、会话、模型选择）
│   │   ├── history/            # 历史管理（分组、清除、加载）
│   │   ├── messages/           # 消息操作（文本转语音）
│   │   └── state/              # 状态管理（辅助状态、会话持久化）
│   ├── core/                   # 核心功能（应用设置、模型列表、画中画、多标签同步、后台保活）
│   ├── data-management/        # 数据管理（会话导出、全量导出/导入）
│   ├── features/               # 功能特性（Python 沙箱、场景管理、Token 计数、设置逻辑）
│   ├── file-upload/            # 文件上传（预处理、压缩、轮询、ID 分配）
│   ├── files/                  # 文件处理（拖拽、上传、轮询）
│   ├── live-api/               # Live API（音频、视频、连接、配置、工具调用、帧捕获）
│   ├── message-sender/         # 消息发送（标准发送、Canvas 生成、图片编辑、TTS/Imagen、流处理）
│   ├── text-selection/         # 文本选择（音频播放、拖拽、定位）
│   ├── ui/                     # UI 相关（代码块、全屏、HTML 预览、PDF 查看器、平滑流式）
│   └── (根级 hooks)            # 通用 hooks（录音、剪贴板、设备检测、消息列表、Slash 命令等）
├── services/                   # 外部服务
│   ├── api/                    # API 层
│   │   ├── generation/         # 生成 API（音频、图片、文本、Token）
│   │   ├── baseApi.ts          # API 基础封装
│   │   ├── chatApi.ts          # 聊天 API（流式 / 非流式消息）
│   │   ├── fileApi.ts          # 文件 API（上传、元数据）
│   │   └── generationApi.ts    # 生成 API 聚合
│   ├── geminiService.ts        # Gemini 服务层（统一接口）
│   ├── logService.ts           # 日志服务
│   ├── networkInterceptor.ts   # 网络拦截器（Fetch Monkey-Patch）
│   ├── pyodideService.ts       # Pyodide Python 运行时（Web Worker）
│   └── streamingStore.ts       # 流式数据存储
├── styles/                     # 样式文件
│   ├── main.css                # 全局样式与 CSS 变量
│   ├── animations.css          # 动画样式
│   └── markdown.css            # Markdown 渲染样式
├── types/                      # TypeScript 类型定义
│   ├── api.ts                  # API 相关类型
│   ├── chat.ts                 # 聊天相关类型
│   ├── settings.ts             # 设置相关类型（ChatSettings, AppSettings, SafetySetting）
│   └── theme.ts                # 主题相关类型
├── utils/                      # 工具函数
│   ├── audio/                  # 音频处理（编解码、AudioWorklet 代码）
│   ├── chat/                   # 聊天工具（消息构建、ID 生成、解析、会话）
│   ├── export/                 # 导出工具（核心、DOM、文件、图片、模板）
│   ├── translations/           # 国际化翻译（中/英，覆盖全部 UI）
│   │   └── settings/           # 设置页面翻译细分
│   ├── apiUtils.ts             # API 工具
│   ├── appUtils.ts             # 应用工具（日志服务、通用函数）
│   ├── db.ts                   # IndexedDB 封装（会话、分组、场景、设置、日志）
│   ├── fileHelpers.ts          # 文件辅助
│   ├── folderImportUtils.ts    # 文件夹导入
│   ├── markdownConfig.ts       # Markdown 渲染配置
│   ├── modelHelpers.ts         # 模型辅助
│   └── ...                     # 其他工具（剪贴板、日期、域名校验、快捷键等）
├── App.tsx                     # 应用入口组件
├── index.tsx                   # 渲染入口（挂载 React、导入样式）
├── index.html                  # HTML 入口（CDN 资源、import map、PWA meta）
├── manifest.json               # PWA 应用清单
├── sw.js                       # Service Worker（离线缓存）
├── vite.config.ts              # Vite 配置（React 插件、Pyodide 静态复制、外部化配置）
├── tsconfig.json               # TypeScript 配置
├── package.json                # 项目依赖
└── LICENSE                     # MIT 许可证
```

---

## 支持的模型

| 类型 | 模型 |
| :--- | :--- |
| **Gemini 3.x** | gemini-3-flash-preview, gemini-3-pro-preview, gemini-3.1-flash-lite-preview, gemini-3.1-pro-preview |
| **Gemini 2.5** | gemini-2.5-pro, gemini-2.5-flash-preview, gemini-2.5-flash-lite-preview, gemini-2.5-flash-native-audio-preview |
| **Gemma 4** | gemma-4-31b-it, gemma-4-26b-a4b-it |
| **Imagen 4.0** | imagen-4.0-fast-generate, imagen-4.0-generate, imagen-4.0-ultra-generate |
| **图片生成** | gemini-2.5-flash-image, gemini-3-pro-image-preview, gemini-3.1-flash-image-preview |
| **TTS** | gemini-2.5-pro-preview-tts, gemini-2.5-flash-preview-tts (30+ 种语音) |

---

## 参与贡献

我们欢迎任何形式的贡献！

1. **报告问题**：提交 [GitHub Issue](https://github.com/yeahhe365/All-Model-Chat/issues)
2. **代码贡献**：Fork 仓库 -> 创建特性分支 -> 提交 Pull Request
3. **支持作者**：点个 **Star** 或前往 [爱发电](https://afdian.com/a/gemini-nexus) 支持持续开发

---

<div align="center">
  <p>Developed with :heart: by <strong>yeahhe365</strong></p>
</div>
