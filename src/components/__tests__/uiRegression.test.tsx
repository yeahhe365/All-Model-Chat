import React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePyodide } from '../../hooks/usePyodide';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { usePdfViewer } from '../../hooks/ui/usePdfViewer';
import { useSettingsStore } from '../../stores/settingsStore';
import { exportElementAsPng } from '../../utils/exportUtils';
import { ChatSuggestions } from '../chat/input/area/ChatSuggestions';
import { HeaderModelSelector } from '../header/HeaderModelSelector';
import { SidebarActions } from '../sidebar/SidebarActions';
import { SidebarHeader } from '../sidebar/SidebarHeader';
import { SessionItem } from '../sidebar/SessionItem';
import { GroupItem } from '../sidebar/GroupItem';
import { ChatInputToolbar } from '../chat/input/ChatInputToolbar';
import { ChatInputModals } from '../chat/input/ChatInputModals';
import { ChatInputActions } from '../chat/input/ChatInputActions';
import { ChatQuoteDisplay } from '../chat/input/area/ChatQuoteDisplay';
import { ScrollNavigation } from '../chat/message-list/ScrollNavigation';
import { LiveStatusBanner } from '../chat/input/LiveStatusBanner';
import { ExportChatModal } from '../modals/ExportChatModal';
import { LogViewer } from '../log-viewer/LogViewer';
import { ApiUsageTab } from '../log-viewer/ApiUsageTab';
import { ConsoleTab } from '../log-viewer/ConsoleTab';
import { TokenUsageTab } from '../log-viewer/TokenUsageTab';
import { ExportModal } from '../message/buttons/export/ExportModal';
import { HtmlPreviewHeader } from '../modals/html-preview/HtmlPreviewHeader';
import { HtmlPreviewContent } from '../modals/html-preview/HtmlPreviewContent';
import { FilePreviewModal } from '../modals/FilePreviewModal';
import { FilePreviewHeader } from '../shared/file-preview/FilePreviewHeader';
import { ImageViewer } from '../shared/file-preview/ImageViewer';
import { PdfToolbar } from '../shared/file-preview/pdf-viewer/PdfToolbar';
import { PdfMainContent } from '../shared/file-preview/pdf-viewer/PdfMainContent';
import { TextFileViewer } from '../shared/file-preview/TextFileViewer';
import { PiPPlaceholder } from '../layout/PiPPlaceholder';
import { TableBlock } from '../message/blocks/TableBlock';
import { CodeBlock } from '../message/blocks/CodeBlock';
import { HtmlPreviewModal } from '../modals/HtmlPreviewModal';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { AudioRecorder } from '../modals/AudioRecorder';
import { AudioPlayerView } from '../chat/message-list/text-selection/AudioPlayerView';
import { AudioPlayer } from '../shared/AudioPlayer';
import { PerformanceMetrics } from '../message/PerformanceMetrics';
import { InlineCode } from '../message/code-block/InlineCode';
import { ToolResultBlock } from '../message/blocks/ToolResultBlock';
import { RecorderControls } from '../recorder/RecorderControls';
import { FileDisplay } from '../message/FileDisplay';
import { SelectedFileDisplay } from '../chat/input/SelectedFileDisplay';
import { DiagramWrapper } from '../message/blocks/parts/DiagramWrapper';
import { SearchSources } from '../message/grounded-response/SearchSources';
import { ContextUrls } from '../message/grounded-response/ContextUrls';
import { ModelPicker } from '../shared/ModelPicker';
import { MessageFooter } from '../message/content/MessageFooter';
import { ScenarioList } from '../scenarios/ScenarioList';
import { ScenarioMessageList } from '../scenarios/editor/ScenarioMessageList';
import { TokenCountFooter } from '../modals/token-count/TokenCountFooter';
import { HelpModal } from '../modals/HelpModal';
import { StandardActionsView } from '../chat/message-list/text-selection/StandardActionsView';
import { MessageActions } from '../message/MessageActions';
import { CreateFileHeader } from '../modals/create-file/CreateFileHeader';
import { CreateFileBody } from '../modals/create-file/CreateFileBody';
import { CreateFileFooter } from '../modals/create-file/CreateFileFooter';
import { ShortcutRecorder } from '../settings/sections/shortcuts/ShortcutRecorder';
import { ApiProxySettings } from '../settings/sections/api-config/ApiProxySettings';
import { DataManagementSection } from '../settings/sections/DataManagementSection';
import { ScenarioSystemPrompt } from '../scenarios/editor/ScenarioSystemPrompt';
import { ScenarioMessageInput } from '../scenarios/editor/ScenarioMessageInput';
import { ModelVoiceSettings } from '../settings/ModelVoiceSettings';
import { ModelSelectorHeader } from '../settings/controls/model-selector/ModelSelectorHeader';
import { ModelListView } from '../settings/controls/model-selector/ModelListView';
import { ModelListEditor } from '../settings/controls/model-selector/ModelListEditor';
import { ModelListEditorRow } from '../settings/controls/model-selector/ModelListEditorRow';
import { ApiConfigToggle } from '../settings/sections/api-config/ApiConfigToggle';
import { ThinkingBudgetSlider } from '../settings/controls/thinking/ThinkingBudgetSlider';
import { ThinkingLevelSelector } from '../settings/controls/thinking/ThinkingLevelSelector';
import { ThinkingControl } from '../settings/controls/thinking/ThinkingControl';
import { ApiConnectionTester } from '../settings/sections/api-config/ApiConnectionTester';
import { ApiConfigSection } from '../settings/sections/ApiConfigSection';
import { ShortcutsSection } from '../settings/sections/ShortcutsSection';
import { SafetySection } from '../settings/sections/SafetySection';
import { AboutSection } from '../settings/sections/AboutSection';
import { ScenarioEditorHeader } from '../scenarios/editor/ScenarioEditorHeader';
import { Select } from '../shared/Select';
import type { UploadedFile, ChatMessage } from '../../types';
import { MediaResolution } from '../../types/settings';
import { logService } from '../../services/logService';

const mockedLogServiceModule = vi.hoisted(() => ({
  getRecentLogs: vi.fn().mockResolvedValue([]),
  subscribe: vi.fn().mockReturnValue(() => {}),
  subscribeToApiKeys: vi.fn().mockReturnValue(() => {}),
  subscribeToTokenUsage: vi.fn().mockReturnValue(() => {}),
  clearLogs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../hooks/usePyodide', () => ({
  usePyodide: vi.fn(() => ({
    isRunning: false,
    output: null,
    image: null,
    files: [],
    error: null,
    hasRun: false,
    runCode: vi.fn(),
    clearOutput: vi.fn(),
    resetState: vi.fn(),
  })),
}));

vi.mock('../../hooks/useAudioRecorder', () => ({
  useAudioRecorder: vi.fn(() => ({
    viewState: 'idle',
    isInitializing: false,
    recordingTime: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
    stream: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    discardRecording: vi.fn(),
  })),
}));

vi.mock('../../services/logService', () => ({
  logService: mockedLogServiceModule,
}));

vi.mock('../../utils/exportUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/exportUtils')>();
  return {
    ...actual,
    exportElementAsPng: vi.fn(),
  };
});

vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: {} },
  Document: ({ children }: { children?: React.ReactNode }) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ pageNumber }: { pageNumber?: number }) => <div data-testid={`pdf-page-${pageNumber ?? 0}`} />,
}));

const t = (key: string) => {
  const table: Record<string, string> = {
    bbox_button_title: '目标检测 (BBox)',
    bbox_button_label: '目标检测',
    guide_button_title: '高清引导 (箭头)',
    guide_button_label: '高清引导',
    headerModelSelectorTooltip_current: '当前模型',
    headerModelSelectorTooltip_action: '点击更改',
    headerModelAriaLabel_current: '当前 AI 模型',
    headerModelAriaLabel_action: '点击更改模型',
    thinking_toggle_aria: '切换思考档位',
    thinking_toggle_fast_minimal_title: '当前思考档位：极速',
    thinking_toggle_fast_low_title: '当前思考档位：低思考',
    thinking_toggle_high_title: '当前思考档位：高思考',
    headerNewChat_aria: '开始新聊天会话',
    newChat: '新聊天',
    history_new_group_title: '新建分组',
    settingsTtsVoice: '语音',
    tts_context_title: 'TTS 导演注释',
    tts_context_label: '上下文',
    tts_context_template: '# 音频人设：[名称]\n## 场景：[描述]\n### 导演注释\n风格：[例如：开心]\n节奏：[例如：轻快]',
    scroll_prev_message: '滚动到上一条消息',
    scroll_down: '滚动到底部',
    live_status_speaking: 'Gemini 正在说话...',
    live_status_listening: '正在聆听...',
    live_status_active: '实时会话已连接，可直接输入',
    live_status_end_call: '结束通话',
    export_chat: '导出对话',
    export_close_aria: '关闭导出对话框',
    export_chat_loading: '正在导出对话...',
    export_chat_loading_hint: '长对话或包含图片时可能需要一点时间。',
    export_message_processing: '正在处理消息内容...',
    export_option_png_label: 'PNG 图片',
    export_option_html_label: 'HTML 文件',
    export_option_txt_label: 'TXT 文件',
    export_option_json_label: 'JSON 文件',
    export_option_message_png_desc: '可视化快照',
    export_option_message_html_desc: '网页格式',
    export_option_message_txt_desc: '纯文本',
    export_option_message_json_desc: '原始数据',
    export_option_chat_png_desc: '整段对话的单张高清图片。',
    export_option_chat_html_desc: '包含文本、代码和样式的独立文件。',
    export_option_chat_txt_desc: '包含对话内容的简单文本文件。',
    export_option_chat_json_desc: '将对话导出为可稍后导入的 JSON 文件。',
    htmlPreview_subtitle_react: 'React 应用',
    htmlPreview_subtitle_html: 'HTML 预览',
    htmlPreview_zoom_out: '缩小',
    htmlPreview_zoom_in: '放大',
    htmlPreview_reload: '重新加载',
    htmlPreview_download_html: '下载 HTML',
    htmlPreview_screenshot: '屏幕截图',
    htmlPreview_exit_fullscreen: '退出全屏',
    htmlPreview_fullscreen: '全屏',
    close: '关闭',
    cancel: '取消',
    select_placeholder: '请选择...',
    filePreview_previous: '上一个',
    filePreview_next: '下一个',
    filePreview_invalid_youtube_url: '无效的 YouTube 链接',
    filePreview_unsupported: '此文件类型暂不支持预览。',
    filePreview_youtube_player: 'YouTube 视频播放器',
    fill_input: '填入输入框',
    selection_quote_title: '引用选中文本',
    selection_quote_label: '引用',
    selection_copy_raw_title: '复制原文',
    selection_read_aloud_title: '朗读选中文本',
    selection_read_aloud_label: '朗读',
    message_continue_generating: '继续生成',
    message_read_aloud: '朗读',
    message_read_aloud_aria: '朗读消息',
    copy: '复制',
    search: '搜索',
    createText_title: '创建新文件',
    createText_filename_placeholder: '文件名',
    createText_edit_title: '编辑文件',
    createText_content_aria: '文件内容',
    createText_extension_aria: '文件扩展名',
    createText_download_pdf: '下载 PDF',
    createText_switch_to_edit: '切换到编辑',
    createText_switch_to_preview: '切换到预览',
    createText_drop_image: '拖放图片以插入',
    createText_preview_empty: '开始输入...',
    createText_generated_with: '由 Markflow AI (All Model Chat) 生成',
    filePreview_save_changes: '保存更改',
    filePreview_edit_file: '编辑文件',
    copy_button_title: '复制内容',
    copied_button_title: '已复制！',
    copy_markdown: '复制 Markdown',
    download: '下载',
    filePreview_download_file: '下载文件',
    filePreview_download_svg: '下载 SVG',
    imageViewer_alt: '{filename} 的缩放视图',
    imageViewer_zoom_out: '缩小',
    imageViewer_zoom_in: '放大',
    imageViewer_reset_view: '重置视图',
    htmlPreview_iframe_title: 'HTML 预览内容',
    htmlPreview_screenshot_error: '截图失败，请检查控制台了解详情。',
    pdf_toggle_thumbnails: '切换缩略图',
    pdf_previous_page: '上一页',
    pdf_page_number_aria: '页码',
    pdf_next_page: '下一页',
    pdf_rotate: '旋转',
    pdf_loading: 'PDF 加载中...',
    pdf_load_error: 'PDF 加载失败。',
    pdf_page_placeholder: '第 {page} 页',
    textViewer_loading: '加载内容中...',
    textViewer_load_error: '文件内容加载失败。',
    filePreview_copy_failed: '复制失败。浏览器可能不支持此功能或需要额外权限。',
    cancelEdit_title: '取消编辑',
    code_open_side_panel: '在侧边栏打开',
    code_download_title: '下载 {language}',
    code_run_python: '运行 Python 代码',
    code_expand: '展开',
    code_collapse: '收起',
    code_show_more: '显示更多',
    code_show_less: '显示更少',
    code_collapse_block: '收起代码块',
    code_output_header: '本地 Python 输出',
    code_reset_view: '重置视图',
    code_close_console: '关闭控制台',
    code_generated_files: '生成的文件',
    code_executed_successfully: '执行成功（无输出）。',
    code_output_plot_alt: '绘图结果',
    errorBoundary_title: '出错了',
    errorBoundary_fallback: '发生了意外错误。',
    errorBoundary_reload: '重新加载',
    metrics_token_usage: 'Token 用量',
    metrics_generation_speed: '生成速度（不含首字延迟）',
    metrics_total_duration: '总耗时',
    selection_generating_audio: '音频生成中...',
    selection_drag_to_move: '拖动移动',
    audio_play: '播放',
    audio_pause: '暂停',
    audio_playback_speed: '播放速度',
    audio_download: '下载音频',
    inlineCode_click_to_copy: '点击复制',
    toolResult_download_output: '下载输出',
    toolResult_generated_files: '生成的输出文件',
    modelPicker_empty: '暂无可用模型',
    messageFooter_generating_suggestions: '正在生成建议...',
    voiceInput_stop_aria: '停止录音',
    cancelRecording_aria: '取消录音',
    audioRecorder_title: '语音录音',
    audioRecorder_review_title: '预览录音',
    audioRecorder_accessing_mic: '正在访问麦克风...',
    audioRecorder_ready: '准备开始录音',
    audioRecorder_system_audio_enabled: '已启用系统音频录制',
    audioRecorder_recording: '录音中',
    audioRecorder_total_duration: '总时长',
    audioRecorder_start: '开始录音',
    audioRecorder_discard: '丢弃',
    audioRecorder_save: '保存录音',
    audioRecorder_saving: '保存中...',
    audioRecorder_save_failed: '保存录音失败。',
    selectedFile_cancel_upload: '取消上传',
    selectedFile_remove_file: '移除文件',
    selectedFile_edit_file: '编辑文件',
    selectedFile_configure_file: '配置文件',
    selectedFile_file_id_copied: '文件 ID 已复制',
    selectedFile_copy_file_id: '复制文件 ID',
    selectedFile_error: '错误',
    selectedFile_uploading: '上传中...',
    selectedFile_processing: '处理中...',
    selectedFile_cancelled: '已取消',
    helpModal_search_placeholder: '搜索命令...',
    helpModal_copy_title: '点击复制',
    helpModal_empty: '未找到与 "{query}" 匹配的命令',
    helpModal_tip: '提示：在聊天输入框输入 / 可立即打开命令菜单。',
    logViewer_title: '系统日志',
    logViewer_console_tab: '控制台',
    logViewer_tokens_tab: 'Token 用量',
    logViewer_api_tab: 'API 用量',
    logViewer_api_usage_stats: 'API 密钥用量统计',
    logViewer_api_key_active: '当前使用',
    logViewer_requests: '请求',
    logViewer_search_placeholder: '搜索日志...',
    logViewer_all_categories: '全部分类',
    logViewer_export_json: '导出 JSON',
    logViewer_clear: '清空',
    logViewer_no_logs: '未找到日志',
    logViewer_load_older: '加载更早日志',
    logViewer_clear_title: '清空日志',
    logViewer_clear_message: '确定要清空数据库中的所有日志和用量统计吗？',
    tokenFooter_estimated: '预估 Token',
    tokenFooter_ready: '准备开始计算',
    tokenFooter_clear_all: '全部清空',
    tokenModal_clear: '清空',
    tokenModal_count: '计算',
    tokens_unit: '个令牌',
    tokenUsage_title: 'Token 用量统计',
    tokenUsage_empty: '暂无 Token 用量记录。',
    tokenUsage_model: '模型',
    tokenUsage_input: '输入 Token',
    tokenUsage_output: '输出 Token',
    tokenUsage_total: '总 Token',
    pip_title: '画中画聊天',
    pip_description: '聊天正在独立窗口中运行。关闭该窗口后会回到这里。',
    pip_close: '关闭画中画窗口',
    settingsData_application: '应用数据',
    settingsData_settings: '设置',
    settingsData_history: '聊天记录',
    settingsData_scenarios: '场景',
    settingsData_system_logs: '系统与日志',
    settingsData_danger_zone: '危险操作',
    settingsViewLogs: '查看日志',
    settingsClearLogs: '清空日志',
    settingsInstallApp: '安装应用',
    settingsReset: '重置设置',
    settingsClearHistory: '清空历史对话',
    settingsClearCache: '清除所有应用数据',
    settingsSystemPrompt_active: '已启用',
    settingsSystemPrompt_expand: '展开编辑器',
    settingsSystemPrompt_input_aria: '系统提示输入区',
    addById_uri_hint_start: '请输入有效的 Gemini API 文件 URI（例如：',
    addById_uri_hint_end: '）',
    settingsMediaResolution_live_tooltip: '控制 Live API 的视频/音频分辨率。',
    settings_generateQuadImages_tooltip: '启用后，使用 Imagen 模型将一次性生成四张独立的图片变体。这将消耗更多 API 用量。',
    quad_images_label: '4 张图',
    quote_remove_aria: '删除引用',
    app_logo_label: 'All Model Chat 标志',
    history_item_actions: '更多操作',
    settingsModelList_manage: '管理模型',
    settingsModelList_cancel_edit: '取消编辑',
    settingsModelList_edit: '编辑列表',
    settingsModelList_pinned: '已固定',
    settingsModelList_active: '当前使用',
    settingsModelList_set_active: '设为当前模型',
    settingsModelList_empty: '暂无可用模型。',
    settingsModelList_editor_empty: '列表中暂无模型。可添加或恢复默认列表。',
    settingsModelList_add: '添加模型',
    settingsModelList_reset: '重置',
    settingsModelList_save: '保存列表',
    settingsModelList_reset_confirm: '将模型列表重置为默认值吗？这会清除所有自定义添加项。',
    settingsModelList_id_placeholder: '模型 ID（例如 gemini-pro）',
    settingsModelList_name_placeholder: '显示名称',
    settingsModelList_remove: '移除',
    settingsThinkingIntensity: '思考强度',
    settingsThinkingLevel_minimal: '极简',
    settingsThinkingLevel_low: '低',
    settingsThinkingLevel_medium: '中',
    settingsThinkingLevel_high: '高',
    settingsThinkingBudget: '思考预算',
    settingsThinkingBudget_tokens: '个令牌',
    settingsThinkingBudget_description: '控制模型内部思考过程可使用的最大令牌数（{min}-{max}）。',
    settingsThinking_gemma_tooltip: 'Gemma 4 使用 <|think|> token 启用思考模式。启用后，模型会在 <|channel|thought> 标签中输出推理内容。',
    settingsThinking_enabled_badge: '思考已启用',
    settingsThinking_inject_token: '将 <|think|> token 注入系统提示',
    settingsThinking_disabled: '思考模式已禁用',
    settingsThinking_gemini_capabilities: 'Gemini 3.0 能力',
    settingsThinking_reasoning_enabled: '推理已启用',
    settingsThinking_off_message: '思考过程已禁用。',
    apiConfig_testModel: '测试模型',
    apiConfig_testConnection: '测试连通性',
    shortcuts_unavailable: '快捷键配置暂不可用。',
    apiConfig_env_key_active: '环境密钥已启用',
    settingsUseCustomApi: '使用自定义 API 配置',
    apiConfig_default_info: '正在使用环境中的默认 API 配置。启用以进行自定义设置。',
    apiConfig_overriding_env: '正在覆盖环境中的 API 密钥',
    apiConfig_using_own_keys: '正在使用你自己的 API 密钥',
    apiConfig_missing_env_key: '环境中未找到 API 密钥。请启用自定义密钥继续。',
    apiConfig_no_key_to_test: '没有可供测试的 API 密钥。',
    apiConfig_no_key_available: '当前没有可用的 API 密钥。',
    apiConfig_invalid_key_format: 'API 密钥格式无效。',
    safety_changes_apply: '更改将应用于新消息。',
    scenarios_empty_title: '未找到场景。',
    scenarios_clear_search: '清除搜索',
    scenarios_moveUp_title: '上移',
    scenarios_moveDown_title: '下移',
    scenarios_edit_title: '编辑消息',
    scenarios_delete_title: '删除消息',
    scenarios_system_prompt_label: '系统提示',
    scenarios_system_prompt_expand: '展开',
    scenarios_system_prompt_help: '定义 AI 的角色、风格和规则。',
    scenarios_add_message_as: '添加消息身份',
    scenarios_role_user: '用户',
    scenarios_role_model: '模型',
    scenarios_add_message_shortcut: '按 CMD/CTRL + Enter 添加',
    scenarioMessages_empty_title: '还没有消息。',
    scenarioMessages_empty_desc: '在下方添加消息来编排对话流程。',
    scenarioMessages_save_hint: '按 Enter 保存',
    shortcuts_recorder_reset: '重置为默认快捷键',
    shortcuts_recorder_reset_aria: '重置快捷键',
    shortcuts_recorder_clear: '清除快捷键',
    shortcuts_recorder_clear_aria: '清除快捷键',
    shortcuts_recorder_press_keys: '按下按键开始录制',
    shortcuts_recorder_click: '点击录制快捷键',
    shortcuts_recorder_current: '当前快捷键',
    shortcuts_recorder_recording: '录制中...',
    shortcuts_recorder_recording_aria: '正在录制快捷键',
    shortcuts_recorder_none: '未设置',
    apiConfig_proxy_label: 'API 代理',
    apiConfig_reset_proxy: '恢复默认代理地址',
    apiConfig_reset_button: '重置',
    apiConfig_proxy_placeholder_disabled: '启用代理后可设置地址',
    apiConfig_proxy_placeholder: '例如：https://api-proxy.de/gemini/v1beta',
    apiConfig_proxy_aria: 'API 代理地址',
    apiConfig_proxy_preview: '实际请求地址预览：',
    about_beta: '测试版',
    about_stars: '星标',
    about_update_available_title: '有新版本：{version}',
    scenarios_back: '返回',
  };

  return table[key] ?? key;
};

const mockedUsePyodide = vi.mocked(usePyodide);
const mockedUseAudioRecorder = vi.mocked(useAudioRecorder);
const mockedExportElementAsPng = vi.mocked(exportElementAsPng);

interface RenderResult {
  container: HTMLDivElement;
  root: Root;
}

const mountedRoots: RenderResult[] = [];

const renderIntoDom = (ui: React.ReactElement) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  const result = { container, root };
  mountedRoots.push(result);
  return result;
};

afterEach(() => {
  mockedUsePyodide.mockReturnValue({
    isRunning: false,
    output: null,
    image: null,
    files: [],
    error: null,
    hasRun: false,
    runCode: vi.fn(),
    clearOutput: vi.fn(),
    resetState: vi.fn(),
  });
  mockedUseAudioRecorder.mockReturnValue({
    viewState: 'idle',
    isInitializing: false,
    recordingTime: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
    stream: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    discardRecording: vi.fn(),
  });
  mockedLogServiceModule.getRecentLogs.mockResolvedValue([]);
  mockedLogServiceModule.subscribe.mockReturnValue(() => {});
  mockedLogServiceModule.subscribeToApiKeys.mockReturnValue(() => {});
  mockedLogServiceModule.subscribeToTokenUsage.mockReturnValue(() => {});
  mockedLogServiceModule.clearLogs.mockResolvedValue(undefined);
  mockedExportElementAsPng.mockReset();
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop()!;
    act(() => {
      mounted.root.unmount();
    });
    mounted.container.remove();
  }
  useSettingsStore.setState({ language: 'en' });
});

describe('UI regression fixes', () => {
  it('renders translated BBox and Guide labels in quick suggestions', () => {
    const { container } = renderIntoDom(
      <ChatSuggestions
        show
        onSuggestionClick={vi.fn()}
        onOrganizeInfoClick={vi.fn()}
        onToggleBBox={vi.fn()}
        isBBoxModeActive={false}
        onToggleGuide={vi.fn()}
        isGuideModeActive={false}
        t={t as any}
        isFullscreen={false}
      />
    );

    expect(container.querySelector('[aria-label="目标检测 (BBox)"]')).toHaveTextContent(
      '目标检测'
    );
    expect(container.querySelector('[aria-label="高清引导 (箭头)"]')).toHaveTextContent(
      '高清引导'
    );
  });

  it('does not show suggestion scroll arrows on touch layouts', () => {
    const { container } = renderIntoDom(
      <ChatSuggestions
        show
        onSuggestionClick={vi.fn()}
        onOrganizeInfoClick={vi.fn()}
        onToggleBBox={vi.fn()}
        isBBoxModeActive={false}
        onToggleGuide={vi.fn()}
        isGuideModeActive={false}
        t={t as any}
        isFullscreen={false}
      />
    );

    const scroller = container.querySelector('.overflow-x-auto') as HTMLDivElement;
    expect(scroller).toBeTruthy();

    Object.defineProperties(scroller, {
      clientWidth: { configurable: true, value: 180 },
      scrollWidth: { configurable: true, value: 520 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(container.querySelector('button[aria-label="scroll_left_aria"]')).toBeNull();
    expect(container.querySelector('button[aria-label="scroll_right_aria"]')).toBeNull();
  });

  it('keeps suggestion scroll arrows on hover-capable pointer-fine layouts', () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query === '(hover: hover) and (pointer: fine)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    try {
      const { container } = renderIntoDom(
        <ChatSuggestions
          show
          onSuggestionClick={vi.fn()}
          onOrganizeInfoClick={vi.fn()}
          onToggleBBox={vi.fn()}
          isBBoxModeActive={false}
          onToggleGuide={vi.fn()}
          isGuideModeActive={false}
          t={t as any}
          isFullscreen={false}
        />
      );

      const scroller = container.querySelector('.overflow-x-auto') as HTMLDivElement;
      expect(scroller).toBeTruthy();

      Object.defineProperties(scroller, {
        clientWidth: { configurable: true, value: 180 },
        scrollWidth: { configurable: true, value: 520 },
        scrollLeft: { configurable: true, value: 0, writable: true },
      });

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(container.querySelector('button[aria-label="scroll_right_aria"]')).toBeTruthy();
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    }
  });

  it('uses a loading fallback instead of undefined in the header model selector tooltip', () => {
    const { container } = renderIntoDom(
      <HeaderModelSelector
        currentModelName={undefined}
        availableModels={[]}
        selectedModelId="gemini-3-flash"
        onSelectModel={vi.fn()}
        isSwitchingModel={false}
        isLoading={false}
        t={t}
        thinkingLevel="LOW"
        onSetThinkingLevel={vi.fn()}
      />
    );

    const trigger = container.querySelector('button[aria-haspopup="listbox"]');
    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute('title')).not.toContain('undefined');
    expect(trigger?.getAttribute('aria-label')).not.toContain('undefined');
  });

  it('uses localized text-selection toolbar actions', () => {
    const { container } = renderIntoDom(
      <StandardActionsView
        onQuote={vi.fn()}
        onInsert={vi.fn()}
        onCopy={vi.fn()}
        onSearch={vi.fn()}
        onTTS={vi.fn()}
        isCopied={false}
        t={t as any}
      />
    );

    expect(container.querySelector('button[title="引用选中文本"]')).toHaveTextContent('引用');
    expect(container.querySelector('button[title="填入输入框"]')).toHaveTextContent('填入输入框');
    expect(container.querySelector('button[title="复制原文"]')).toHaveTextContent('复制');
    expect(container.querySelector('button[title="搜索"]')).toHaveTextContent('搜索');
    expect(container.querySelector('button[title="朗读选中文本"]')).toHaveTextContent('朗读');
  });

  it('uses localized message action titles for model responses', () => {
    const message: ChatMessage = {
      id: 'message-1',
      role: 'model',
      content: 'Localized action targets',
      timestamp: new Date('2026-04-09T00:00:00Z'),
    };

    const { container } = renderIntoDom(
      <MessageActions
        message={message}
        sessionTitle="Session"
        messageIndex={0}
        isGrouped={false}
        onEditMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
        onRetryMessage={vi.fn()}
        onTextToSpeech={vi.fn()}
        onGenerateCanvas={vi.fn()}
        onContinueGeneration={vi.fn()}
        ttsMessageId={null}
        themeId="light"
        t={t as any}
      />
    );

    expect(container.querySelector('button[title="继续生成"]')).toHaveAttribute('aria-label', '继续生成');
    expect(container.querySelector('button[title="朗读"]')).toHaveAttribute('aria-label', '朗读消息');
  });

  it('uses localized performance metric tooltips', () => {
    const message: ChatMessage = {
      id: 'message-metrics',
      role: 'model',
      content: 'Metrics',
      timestamp: new Date('2026-04-09T00:00:00Z'),
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      generationStartTime: new Date('2026-04-09T00:00:00Z'),
      generationEndTime: new Date('2026-04-09T00:00:03Z'),
      firstTokenTimeMs: 500,
    };

    const { container } = renderIntoDom(<PerformanceMetrics message={message} t={t as any} />);

    expect(container.querySelector('[title="Token 用量"]')).toBeTruthy();
    expect(container.querySelector('[title="生成速度（不含首字延迟）"]')).toBeTruthy();
    expect(container.querySelector('[title="总耗时"]')).toBeTruthy();
  });

  it('uses localized loading and drag copy in the text-selection audio view', () => {
    useSettingsStore.setState({ language: 'zh' });
    const audioRef = React.createRef<HTMLAudioElement>();

    const loadingRender = renderIntoDom(
      <AudioPlayerView
        audioUrl={null}
        isLoading
        audioRef={audioRef}
        onDragStart={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(loadingRender.container).toHaveTextContent('音频生成中...');

    act(() => {
      loadingRender.root.unmount();
    });
    mountedRoots.pop();
    loadingRender.container.remove();

    const readyRender = renderIntoDom(
      <AudioPlayerView
        audioUrl="blob:audio"
        isLoading={false}
        audioRef={audioRef}
        onDragStart={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(readyRender.container.querySelector('div[title="拖动移动"]')).toBeTruthy();
  });

  it('uses localized audio player controls', () => {
    useSettingsStore.setState({ language: 'zh' });
    const { container } = renderIntoDom(<AudioPlayer src="blob:tts" />);

    expect(container.querySelector('button[aria-label="播放"]')).toBeTruthy();
    expect(container.querySelector('button[title="播放速度"]')).toBeTruthy();
    expect(container.querySelector('button[title="下载音频"]')).toBeTruthy();
  });

  it('uses localized inline-code copy prompts', async () => {
    useSettingsStore.setState({ language: 'zh' });
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: vi.fn(),
        },
      });
    }
    const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValueOnce(undefined);

    try {
      const { container } = renderIntoDom(<InlineCode>{'const value = 1;'}</InlineCode>);

      expect(container.querySelector('code')).toHaveAttribute('title', '点击复制');

      await act(async () => {
        container.querySelector('code')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });

      expect(container).toHaveTextContent('已复制！');
    } finally {
      clipboardSpy.mockRestore();
    }
  });

  it('uses localized tool-result actions and labels', () => {
    useSettingsStore.setState({ language: 'zh' });
    const file: UploadedFile = {
      id: 'generated-1',
      name: 'generated-chart.png',
      type: 'image/png',
      size: 10,
      dataUrl: 'blob:generated',
    };

    const { container } = renderIntoDom(
      <ToolResultBlock files={[file]} onImageClick={vi.fn()}>
        <pre>chart,data</pre>
      </ToolResultBlock>
    );

    expect(container.querySelector('button[title="下载输出"]')).toBeTruthy();
    expect(container).toHaveTextContent('生成的输出文件');
  });

  it('uses localized image file actions and labels', () => {
    useSettingsStore.setState({ language: 'zh' });
    const file: UploadedFile = {
      id: 'image-file',
      name: 'generated-image-1.png',
      type: 'image/png',
      size: 10,
      dataUrl: 'blob:image',
      fileApiName: 'files/generated-image-1',
      uploadState: 'active',
    };

    const { container } = renderIntoDom(<FileDisplay file={file} isFromMessageList />);

    expect(container.querySelector('img')).toHaveAttribute('aria-label', '已上传图片：generated-image-1.png');
    expect(container.querySelector('button[title="下载图片"]')).toBeTruthy();
    expect(container.querySelector('button[title="复制文件 ID"]')).toBeTruthy();
  });

  it('uses localized file-card status and actions', () => {
    useSettingsStore.setState({ language: 'zh' });
    const videoFile: UploadedFile = {
      id: 'video-file',
      name: 'clip.mp4',
      type: 'video/mp4',
      size: 1024,
      dataUrl: 'blob:video',
      videoMetadata: { startOffset: '0s', endOffset: '2s' },
    };

    const { container } = renderIntoDom(
      <FileDisplay
        file={videoFile}
        isFromMessageList
        onConfigure={vi.fn()}
        isGemini3={false}
      />
    );

    expect(container.querySelector('span[title="视频已裁剪"]')).toBeTruthy();
    expect(container.querySelector('button[title="配置"]')).toBeTruthy();
    expect(container.querySelector('button[title="下载"]')).toBeTruthy();

    act(() => {
      mountedRoots[mountedRoots.length - 1].root.unmount();
    });
    mountedRoots.pop();
    container.remove();

    const errorFile: UploadedFile = {
      id: 'error-file',
      name: 'broken.txt',
      type: 'text/plain',
      size: 5,
      error: 'boom',
    };

    const errorRender = renderIntoDom(<FileDisplay file={errorFile} />);
    expect(errorRender.container).toHaveTextContent('错误');
  });

  it('uses localized diagram wrapper actions', () => {
    useSettingsStore.setState({ language: 'zh' });
    const diagramFile: UploadedFile = {
      id: 'diagram-file',
      name: 'generated-mermaid.png',
      type: 'image/png',
      size: 10,
      dataUrl: 'blob:diagram',
    };

    const { container } = renderIntoDom(
      <DiagramWrapper
        title="Mermaid"
        code="graph TD; A-->B;"
        error=""
        isRendering={false}
        isDownloading={false}
        diagramFile={diagramFile}
        showSource
        setShowSource={vi.fn()}
        onImageClick={vi.fn()}
        onDownloadJpg={vi.fn()}
        onOpenSidePanel={vi.fn()}
        themeId="light"
      >
        <svg />
      </DiagramWrapper>
    );

    expect(container.querySelector('button[title="隐藏源码"]')).toBeTruthy();
    expect(container.querySelector('button[title="在侧边栏打开"]')).toBeTruthy();
    expect(container.querySelector('button[title="放大图表"]')).toBeTruthy();
    expect(container.querySelector('button[title="下载 JPG"]')).toBeTruthy();
    expect(container.querySelector('button[title="复制代码"]')).toBeTruthy();
  });

  it('uses localized grounded-search section labels', () => {
    useSettingsStore.setState({ language: 'zh' });
    const { container } = renderIntoDom(
      <SearchSources
        sources={[
          { uri: 'https://example.com/article', title: '' },
        ]}
      />
    );

    expect(container).toHaveTextContent('来源');
    expect(container).toHaveTextContent('网页来源');
  });

  it('uses localized context-url labels', () => {
    useSettingsStore.setState({ language: 'zh' });
    const { container } = renderIntoDom(
      <ContextUrls
        metadata={{
          urlMetadata: [
            {
              retrievedUrl: 'https://example.com/path',
              urlRetrievalStatus: 'SUCCESS',
            },
          ],
        }}
      />
    );

    expect(container).toHaveTextContent('上下文链接');
    expect(container.querySelector('a')).toHaveAttribute('title', '状态：SUCCESS');
  });

  it('uses localized empty-state copy in the model picker', () => {
    const { container } = renderIntoDom(
      <ModelPicker
        models={[]}
        selectedId=""
        onSelect={vi.fn()}
        t={t}
        renderTrigger={({ setIsOpen, ref }) => (
          <button ref={ref} onClick={() => setIsOpen(true)}>
            open
          </button>
        )}
      />
    );

    act(() => {
      container.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container).toHaveTextContent('暂无可用模型');
  });

  it('uses localized loading copy while suggestions are generating', () => {
    const message: ChatMessage = {
      id: 'message-suggestions',
      role: 'model',
      content: 'Suggestions pending',
      timestamp: new Date('2026-04-09T00:00:00Z'),
      isGeneratingSuggestions: true,
    };

    const { container } = renderIntoDom(<MessageFooter message={message} t={t as any} />);

    expect(container).toHaveTextContent('正在生成建议...');
  });

  it('uses localized copy in recorder controls', () => {
    useSettingsStore.setState({ language: 'zh' });

    const idleRender = renderIntoDom(
      <RecorderControls
        viewState="idle"
        isInitializing={false}
        isSaving={false}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onCancel={vi.fn()}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(idleRender.container).toHaveTextContent('开始录音');

    act(() => {
      idleRender.root.unmount();
    });
    mountedRoots.pop();
    idleRender.container.remove();

    const recordingRender = renderIntoDom(
      <RecorderControls
        viewState="recording"
        isInitializing={false}
        isSaving={false}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onCancel={vi.fn()}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(recordingRender.container.querySelector('button[title="取消录音"]')).toBeTruthy();
    expect(recordingRender.container.querySelector('button[title="停止录音"]')).toBeTruthy();

    act(() => {
      recordingRender.root.unmount();
    });
    mountedRoots.pop();
    recordingRender.container.remove();

    const reviewRender = renderIntoDom(
      <RecorderControls
        viewState="review"
        isInitializing={false}
        isSaving={false}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onCancel={vi.fn()}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(reviewRender.container).toHaveTextContent('丢弃');
    expect(reviewRender.container).toHaveTextContent('保存录音');
  });

  it('uses localized copy in the audio recorder modal', () => {
    useSettingsStore.setState({ language: 'zh' });
    mockedUseAudioRecorder.mockReturnValue({
      viewState: 'idle',
      isInitializing: true,
      recordingTime: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
      stream: null,
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      discardRecording: vi.fn(),
    });

    renderIntoDom(
      <AudioRecorder
        onRecord={vi.fn()}
        onCancel={vi.fn()}
        isSystemAudioRecordingEnabled
      />
    );

    expect(document.body).toHaveTextContent('语音录音');
    expect(document.body).toHaveTextContent('正在访问麦克风...');

    act(() => {
      mountedRoots[mountedRoots.length - 1].root.unmount();
    });
    mountedRoots.pop();
    document.body.innerHTML = '';

    mockedUseAudioRecorder.mockReturnValue({
      viewState: 'review',
      isInitializing: false,
      recordingTime: 65,
      audioBlob: new Blob(['audio'], { type: 'audio/webm' }),
      audioUrl: 'blob:recording',
      error: null,
      stream: null,
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      discardRecording: vi.fn(),
    });

    renderIntoDom(
      <AudioRecorder
        onRecord={vi.fn()}
        onCancel={vi.fn()}
        isSystemAudioRecordingEnabled={false}
      />
    );

    expect(document.body).toHaveTextContent('预览录音');
    expect(document.body).toHaveTextContent('总时长');
  });

  it('uses localized copy in selected-file actions and statuses', () => {
    useSettingsStore.setState({ language: 'zh' });

    const activeFile: UploadedFile = {
      id: 'selected-file',
      name: 'notes.md',
      type: 'text/markdown',
      size: 256,
      uploadState: 'active',
      fileApiName: 'files/notes-md',
    };

    const activeRender = renderIntoDom(
      <SelectedFileDisplay
        file={activeFile}
        onRemove={vi.fn()}
        onCancelUpload={vi.fn()}
        onConfigure={vi.fn()}
      />
    );

    expect(activeRender.container.querySelector('button[title="移除文件"]')).toBeTruthy();
    expect(activeRender.container.querySelector('button[title="编辑文件"]')).toBeTruthy();
    expect(activeRender.container.querySelector('button[title="复制文件 ID"]')).toBeTruthy();

    act(() => {
      activeRender.root.unmount();
    });
    mountedRoots.pop();
    activeRender.container.remove();

    const uploadingRender = renderIntoDom(
      <SelectedFileDisplay
        file={{
          id: 'uploading-file',
          name: 'clip.mp4',
          type: 'video/mp4',
          size: 1024,
          uploadState: 'uploading',
        }}
        onRemove={vi.fn()}
        onCancelUpload={vi.fn()}
      />
    );

    expect(uploadingRender.container.querySelector('button[title="取消上传"]')).toBeTruthy();
    expect(uploadingRender.container).toHaveTextContent('上传中...');

    act(() => {
      uploadingRender.root.unmount();
    });
    mountedRoots.pop();
    uploadingRender.container.remove();

    const cancelledRender = renderIntoDom(
      <SelectedFileDisplay
        file={{
          id: 'cancelled-file',
          name: 'draft.txt',
          type: 'text/plain',
          size: 64,
          uploadState: 'cancelled',
        }}
        onRemove={vi.fn()}
        onCancelUpload={vi.fn()}
      />
    );

    expect(cancelledRender.container).toHaveTextContent('已取消');
  });

  it('uses localized copy in the help modal', async () => {
    renderIntoDom(
      <HelpModal
        isOpen
        onClose={vi.fn()}
        commands={[{ name: '/help', description: '显示帮助' }]}
        t={t as any}
      />
    );

    expect(document.body.querySelector('input[placeholder="搜索命令..."]')).toBeTruthy();
    expect(document.body.querySelector('button[title="点击复制"]')).toBeTruthy();
    expect(document.body).toHaveTextContent('提示：在聊天输入框输入 / 可立即打开命令菜单。');

    await act(async () => {
      const input = document.body.querySelector('input') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!
        .set!
        .call(input, 'missing');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    expect(document.body).toHaveTextContent('未找到与 "missing" 匹配的命令');
  });

  it('uses localized copy in the token count footer', () => {
    const { container } = renderIntoDom(
      <TokenCountFooter
        tokenCount={null}
        isLoading={false}
        hasContent
        onClear={vi.fn()}
        onCalculate={vi.fn()}
        t={t}
      />
    );

    expect(container).toHaveTextContent('准备开始计算');
    expect(container.querySelector('button[title="全部清空"]')).toBeTruthy();

    act(() => {
      mountedRoots[mountedRoots.length - 1].root.unmount();
    });
    mountedRoots.pop();
    container.remove();

    const countedRender = renderIntoDom(
      <TokenCountFooter
        tokenCount={1234}
        isLoading={false}
        hasContent
        onClear={vi.fn()}
        onCalculate={vi.fn()}
        t={t}
      />
    );

    expect(countedRender.container).toHaveTextContent('预估 Token');
    expect(countedRender.container).toHaveTextContent('个令牌');
  });

  it('uses localized copy in the console log tab', () => {
    useSettingsStore.setState({ language: 'zh' });
    const { container } = renderIntoDom(
      <ConsoleTab
        logs={[]}
        isLoading={false}
        hasMore={false}
        onFetchMore={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(container.querySelector('input[placeholder="搜索日志..."]')).toBeTruthy();
    expect(container).toHaveTextContent('全部分类');
    expect(container.querySelector('button[title="导出 JSON"]')).toBeTruthy();
    expect(container).toHaveTextContent('清空');
    expect(container).toHaveTextContent('未找到日志');
  });

  it('uses localized copy in the log viewer shell and clear confirmation', async () => {
    useSettingsStore.setState({ language: 'zh' });
    const getRecentLogsSpy = vi.spyOn(logService, 'getRecentLogs').mockReturnValue(new Promise(() => {}) as Promise<any>);
    const subscribeSpy = vi.spyOn(logService, 'subscribe').mockReturnValue(() => {});
    const tokenSpy = vi.spyOn(logService, 'subscribeToTokenUsage').mockReturnValue(() => {});
    const clearSpy = vi.spyOn(logService, 'clearLogs').mockResolvedValue(undefined);

    try {
      renderIntoDom(
        <LogViewer
          isOpen
          onClose={vi.fn()}
          appSettings={{ useCustomApiConfig: false } as any}
          currentChatSettings={{} as any}
        />
      );

      expect(document.body).toHaveTextContent('系统日志');
      expect(document.body).toHaveTextContent('控制台');
      expect(document.body).toHaveTextContent('Token 用量');

      await act(async () => {
        document.body
          .querySelector('button[title="清空日志"]')!
          .dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });

      expect(document.body).toHaveTextContent('清空日志');
      expect(document.body).toHaveTextContent('确定要清空数据库中的所有日志和用量统计吗？');
    } finally {
      getRecentLogsSpy.mockRestore();
      subscribeSpy.mockRestore();
      tokenSpy.mockRestore();
      clearSpy.mockRestore();
    }
  });

  it('uses localized copy in the token usage tab', () => {
    useSettingsStore.setState({ language: 'zh' });
    const emptyRender = renderIntoDom(<TokenUsageTab tokenUsage={new Map()} />);

    expect(emptyRender.container).toHaveTextContent('Token 用量统计');
    expect(emptyRender.container).toHaveTextContent('暂无 Token 用量记录。');

    act(() => {
      emptyRender.root.unmount();
    });
    mountedRoots.pop();
    emptyRender.container.remove();

    const populatedRender = renderIntoDom(
      <TokenUsageTab tokenUsage={new Map([['gemini-2.5-pro', { prompt: 10, completion: 20 }]])} />
    );

    expect(populatedRender.container).toHaveTextContent('模型');
    expect(populatedRender.container).toHaveTextContent('输入 Token');
    expect(populatedRender.container).toHaveTextContent('输出 Token');
    expect(populatedRender.container).toHaveTextContent('总 Token');
  });

  it('uses localized copy in the API usage tab', () => {
    useSettingsStore.setState({ language: 'zh' });
    const { container } = renderIntoDom(
      <ApiUsageTab
        apiKeyUsage={new Map([['test-api-key', 12]])}
        appSettings={{ apiKey: 'test-api-key' } as any}
        currentChatSettings={{ lockedApiKey: 'test-api-key' } as any}
      />
    );

    expect(container).toHaveTextContent('API 密钥用量统计');
    expect(container).toHaveTextContent('当前使用');
    expect(container).toHaveTextContent('请求');
  });

  it('uses localized copy in the picture-in-picture placeholder', () => {
    useSettingsStore.setState({ language: 'zh' });
    const { container } = renderIntoDom(<PiPPlaceholder onClosePip={vi.fn()} />);

    expect(container).toHaveTextContent('画中画聊天');
    expect(container).toHaveTextContent('聊天正在独立窗口中运行。关闭该窗口后会回到这里。');
    expect(container).toHaveTextContent('关闭画中画窗口');
  });

  it('uses localized scenario list empty state and clear-search action', () => {
    const { container } = renderIntoDom(
      <ScenarioList
        scenarios={[]}
        systemScenarioIds={[]}
        searchQuery="abc"
        setSearchQuery={vi.fn()}
        onLoad={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onExport={vi.fn()}
        t={t as any}
      />
    );

    expect(container).toHaveTextContent('未找到场景。');
    expect(container).toHaveTextContent('清除搜索');
  });

  it('uses localized empty-state copy in the scenario message list', () => {
    useSettingsStore.setState({ language: 'zh' });
    const { container } = renderIntoDom(
      <ScenarioMessageList
        messages={[]}
        editingMessageId={null}
        setEditingMessageId={vi.fn()}
        onUpdateMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
        onMoveMessage={vi.fn()}
        readOnly={false}
      />
    );

    expect(container).toHaveTextContent('还没有消息。');
    expect(container).toHaveTextContent('在下方添加消息来编排对话流程。');
  });

  it('uses localized save hint while editing scenario messages', () => {
    useSettingsStore.setState({ language: 'zh' });
    const { container } = renderIntoDom(
      <ScenarioMessageList
        messages={[{ id: 'msg-1', role: 'user', content: '你好' }]}
        editingMessageId="msg-1"
        setEditingMessageId={vi.fn()}
        onUpdateMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
        onMoveMessage={vi.fn()}
        readOnly={false}
      />
    );

    expect(container).toHaveTextContent('按 Enter 保存');
  });

  it('uses localized titles for scenario message actions', () => {
    useSettingsStore.setState({ language: 'zh' });
    const { container } = renderIntoDom(
      <ScenarioMessageList
        messages={[
          { id: 'msg-1', role: 'user', content: '你好' },
          { id: 'msg-2', role: 'model', content: '世界' },
        ]}
        editingMessageId={null}
        setEditingMessageId={vi.fn()}
        onUpdateMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
        onMoveMessage={vi.fn()}
        readOnly={false}
      />
    );

    expect(container.querySelector('button[title="上移"]')).toBeTruthy();
    expect(container.querySelector('button[title="下移"]')).toBeTruthy();
    expect(container.querySelector('button[title="编辑消息"]')).toBeTruthy();
    expect(container.querySelector('button[title="删除消息"]')).toBeTruthy();
  });

  it('uses localized create-file modal copy and labels', () => {
    const headerRender = renderIntoDom(
      <CreateFileHeader
        isEditing
        isPdf
        isExportingPdf={false}
        isPdfPreviewReady
        supportsRichPreview
        isPreviewMode={false}
        setIsPreviewMode={vi.fn()}
        handleDownloadPdf={vi.fn()}
        onClose={vi.fn()}
        t={t as any}
      />
    );

    expect(headerRender.container).toHaveTextContent('编辑文件');
    expect(headerRender.container.querySelector('button[title="下载 PDF"]')).toBeTruthy();
    expect(headerRender.container.querySelector('button[title="切换到预览"]')).toBeTruthy();

    act(() => {
      headerRender.root.unmount();
    });
    mountedRoots.pop();
    headerRender.container.remove();

    const textareaRef = React.createRef<HTMLTextAreaElement>();
    const printRef = React.createRef<HTMLDivElement>();
    const bodyRender = renderIntoDom(
      <CreateFileBody
        textContent=""
        setTextContent={vi.fn()}
        debouncedContent=""
        textareaRef={textareaRef}
        printRef={printRef}
        isPdf={false}
        setIsPdfPreviewReady={vi.fn()}
        isPreviewMode={false}
        supportsRichPreview
        handlePaste={vi.fn()}
        handleDrop={vi.fn()}
        themeId="light"
        t={t as any}
      />
    );

    const textarea = bodyRender.container.querySelector('textarea');
    expect(textarea).toHaveAttribute('aria-label', '文件内容');
    expect(bodyRender.container).toHaveTextContent('开始输入...');
    expect(bodyRender.container).toHaveTextContent('由 Markflow AI (All Model Chat) 生成');

    act(() => {
      const dragEnterEvent = new Event('dragenter', { bubbles: true, cancelable: true });
      Object.defineProperty(dragEnterEvent, 'dataTransfer', {
        configurable: true,
        value: { types: ['Files'] },
      });
      textarea!.dispatchEvent(dragEnterEvent);
    });

    expect(bodyRender.container).toHaveTextContent('拖放图片以插入');

    act(() => {
      bodyRender.root.unmount();
    });
    mountedRoots.pop();
    bodyRender.container.remove();

    const footerRender = renderIntoDom(
      <CreateFileFooter
        filenameBase="draft"
        setFilenameBase={vi.fn()}
        extension=".md"
        setExtension={vi.fn()}
        onSave={vi.fn()}
        isEditing={false}
        isPdf={false}
        isProcessing={false}
        isLoading={false}
        isExportingPdf={false}
        isPdfPreviewReady
        hasContent
        t={t as any}
      />
    );

    expect(footerRender.container.querySelector('input')).toHaveAttribute('aria-label', '文件名');
    expect(footerRender.container.querySelector('select')).toHaveAttribute('aria-label', '文件扩展名');
  });

  it('uses localized shortcut recorder controls and statuses', () => {
    useSettingsStore.setState({ language: 'zh' });
    const emptyRender = renderIntoDom(
      <ShortcutRecorder value="" defaultValue="" onChange={vi.fn()} />
    );

    expect(emptyRender.container.querySelector('button[title="点击录制快捷键"]')).toBeTruthy();
    expect(emptyRender.container).toHaveTextContent('未设置');

    act(() => {
      emptyRender.container
        .querySelector('button[title="点击录制快捷键"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(
      emptyRender.container.querySelector('button[title="按下按键开始录制"]')
    ).toHaveAttribute('aria-label', '正在录制快捷键');
    expect(emptyRender.container).toHaveTextContent('录制中...');

    act(() => {
      emptyRender.root.unmount();
    });
    mountedRoots.pop();
    emptyRender.container.remove();

    const changedRender = renderIntoDom(
      <ShortcutRecorder value="mod+k" defaultValue="mod+shift+k" onChange={vi.fn()} />
    );

    expect(
      changedRender.container.querySelector('button[title="重置为默认快捷键"]')
    ).toHaveAttribute('aria-label', '重置快捷键');
    expect(
      changedRender.container.querySelector('button[title="清除快捷键"]')
    ).toHaveAttribute('aria-label', '清除快捷键');
  });

  it('uses localized API proxy labels and helper text', () => {
    const { container } = renderIntoDom(
      <ApiProxySettings
        useApiProxy={false}
        setUseApiProxy={vi.fn()}
        apiProxyUrl={null}
        setApiProxyUrl={vi.fn()}
        t={t as any}
      />
    );

    expect(container).toHaveTextContent('API 代理');
    expect(container.querySelector('button[title="恢复默认代理地址"]')).toHaveTextContent('重置');
    expect(container.querySelector('#api-proxy-url-input')).toHaveAttribute('placeholder', '启用代理后可设置地址');
    expect(container.querySelector('#api-proxy-url-input')).toHaveAttribute('aria-label', 'API 代理地址');
    expect(container).toHaveTextContent('实际请求地址预览：');
  });

  it('uses localized labels in the data management section', () => {
    const { container } = renderIntoDom(
      <DataManagementSection
        onClearHistory={vi.fn()}
        onClearCache={vi.fn()}
        onOpenLogViewer={vi.fn()}
        onClearLogs={vi.fn()}
        isInstallable
        onInstallPwa={vi.fn()}
        onImportSettings={vi.fn()}
        onExportSettings={vi.fn()}
        onImportHistory={vi.fn()}
        onExportHistory={vi.fn()}
        onImportScenarios={vi.fn()}
        onExportScenarios={vi.fn()}
        onReset={vi.fn()}
        t={t as any}
      />
    );

    expect(container).toHaveTextContent('应用数据');
    expect(container).toHaveTextContent('设置');
    expect(container).toHaveTextContent('聊天记录');
    expect(container).toHaveTextContent('场景');
    expect(container).toHaveTextContent('系统与日志');
    expect(container).toHaveTextContent('危险操作');
  });

  it('uses localized system-prompt helper copy in the scenario editor', () => {
    const { container } = renderIntoDom(
      <ScenarioSystemPrompt
        value=""
        onChange={vi.fn()}
        onExpand={vi.fn()}
        readOnly={false}
        t={t as any}
      />
    );

    expect(container).toHaveTextContent('系统提示');
    expect(container.querySelector('button[title="展开"]')).toBeTruthy();
    expect(container).toHaveTextContent('定义 AI 的角色、风格和规则。');
  });

  it('uses localized add-message controls in the scenario editor', () => {
    const { container } = renderIntoDom(
      <ScenarioMessageInput
        role="user"
        setRole={vi.fn()}
        content=""
        setContent={vi.fn()}
        onAdd={vi.fn()}
        inputRef={React.createRef<HTMLTextAreaElement>()}
        readOnly={false}
        t={t as any}
      />
    );

    expect(container).toHaveTextContent('添加消息身份');
    expect(container).toHaveTextContent('用户');
    expect(container).toHaveTextContent('模型');
    expect(container).toHaveTextContent('按 CMD/CTRL + Enter 添加');
  });

  it('uses localized system-prompt status and labels in model settings', () => {
    const { container } = renderIntoDom(
      <ModelVoiceSettings
        modelId="gemini-live-2.5-flash-preview"
        setModelId={vi.fn()}
        availableModels={[{ id: 'gemini-live-2.5-flash-preview', name: 'Gemini Live 2.5 Flash Preview' }]}
        transcriptionModelId="gemini-2.5-flash"
        setTranscriptionModelId={vi.fn()}
        generateQuadImages={false}
        setGenerateQuadImages={vi.fn()}
        ttsVoice="Aoede"
        setTtsVoice={vi.fn()}
        t={t as any}
        systemInstruction="你是一名助理"
        setSystemInstruction={vi.fn()}
        thinkingBudget={0}
        setThinkingBudget={vi.fn()}
        showThoughts={false}
        setShowThoughts={vi.fn()}
        temperature={0.5}
        setTemperature={vi.fn()}
        topP={0.9}
        setTopP={vi.fn()}
        topK={64}
        setTopK={vi.fn()}
        setAvailableModels={vi.fn()}
        mediaResolution={MediaResolution.MEDIA_RESOLUTION_LOW}
        setMediaResolution={vi.fn()}
      />
    );

    expect(container.querySelector('[title="已启用"]')).toBeTruthy();
    expect(container.querySelector('button[title="展开编辑器"]')).toBeTruthy();
    expect(container.querySelector('textarea[aria-label="系统提示输入区"]')).toBeTruthy();
    expect(container).toHaveTextContent('控制 Live API 的视频/音频分辨率。');
  });

  it('uses localized model-selector header copy', () => {
    const { container } = renderIntoDom(
      <ModelSelectorHeader isEditingList={false} setIsEditingList={vi.fn()} t={t as any} />
    );

    expect(container).toHaveTextContent('管理模型');
    expect(container).toHaveTextContent('编辑列表');
  });

  it('uses localized model list status labels and empty state', () => {
    const populatedRender = renderIntoDom(
      <ModelListView
        availableModels={[
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', isPinned: true },
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        ]}
        selectedModelId="gemini-2.5-pro"
        onSelectModel={vi.fn()}
        t={t as any}
      />
    );

    expect(populatedRender.container).toHaveTextContent('已固定');
    expect(populatedRender.container).toHaveTextContent('当前使用');
    expect(populatedRender.container).toHaveTextContent('设为当前模型');

    act(() => {
      populatedRender.root.unmount();
    });
    mountedRoots.pop();
    populatedRender.container.remove();

    const emptyRender = renderIntoDom(
      <ModelListView
        availableModels={[]}
        selectedModelId=""
        onSelectModel={vi.fn()}
        t={t as any}
      />
    );

    expect(emptyRender.container).toHaveTextContent('暂无可用模型。');
  });

  it('uses localized model-list editor actions and placeholders', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    try {
      const emptyRender = renderIntoDom(
        <ModelListEditor availableModels={[]} onSave={vi.fn()} setIsEditingList={vi.fn()} t={t as any} />
      );

      expect(emptyRender.container).toHaveTextContent('列表中暂无模型。可添加或恢复默认列表。');
      expect(emptyRender.container).toHaveTextContent('添加模型');
      expect(emptyRender.container).toHaveTextContent('重置');
      expect(emptyRender.container).toHaveTextContent('保存列表');

      act(() => {
        emptyRender.container.querySelector('button:nth-of-type(2)')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(confirmSpy).toHaveBeenCalledWith('将模型列表重置为默认值吗？这会清除所有自定义添加项。');

      act(() => {
        emptyRender.root.unmount();
      });
      mountedRoots.pop();
      emptyRender.container.remove();

      const rowRender = renderIntoDom(
        <ModelListEditorRow
          model={{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }}
          index={0}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
          t={t as any}
        />
      );

      const inputs = rowRender.container.querySelectorAll('input');
      expect(inputs[0]).toHaveAttribute('placeholder', '模型 ID（例如 gemini-pro）');
      expect(inputs[1]).toHaveAttribute('placeholder', '显示名称');
      expect(rowRender.container.querySelector('button[title="移除"]')).toBeTruthy();
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it('uses localized API config toggle copy', () => {
    const envRender = renderIntoDom(
      <ApiConfigToggle
        useCustomApiConfig={false}
        setUseCustomApiConfig={vi.fn()}
        hasEnvKey
        t={t as any}
      />
    );

    expect(envRender.container).toHaveTextContent('环境密钥已启用');
    expect(envRender.container).toHaveTextContent('正在使用环境中的默认 API 配置。启用以进行自定义设置。');

    act(() => {
      envRender.root.unmount();
    });
    mountedRoots.pop();
    envRender.container.remove();

    const customRender = renderIntoDom(
      <ApiConfigToggle
        useCustomApiConfig
        setUseCustomApiConfig={vi.fn()}
        hasEnvKey={false}
        t={t as any}
      />
    );

    expect(customRender.container).toHaveTextContent('正在使用你自己的 API 密钥');
  });

  it('uses localized labels in thinking budget controls', () => {
    const { container } = renderIntoDom(
      <ThinkingBudgetSlider minBudget={1024} maxBudget={8192} value="2048" onChange={vi.fn()} t={t as any} />
    );

    expect(container).toHaveTextContent('思考预算');
    expect(container).toHaveTextContent('2,048 个令牌');
    expect(container).toHaveTextContent('控制模型内部思考过程可使用的最大令牌数（1024-8192）。');
  });

  it('uses localized labels in thinking level controls', () => {
    const { container } = renderIntoDom(
      <ThinkingLevelSelector
        thinkingLevel="LOW"
        setThinkingLevel={vi.fn()}
        isFlash3
        hideMedium={false}
        t={t as any}
      />
    );

    expect(container).toHaveTextContent('思考强度');
    expect(container).toHaveTextContent('极简');
    expect(container).toHaveTextContent('低');
    expect(container).toHaveTextContent('中');
    expect(container).toHaveTextContent('高');
  });

  it('uses localized API connection tester model label', () => {
    const { container } = renderIntoDom(
      <ApiConnectionTester
        onTest={vi.fn()}
        testStatus="idle"
        testMessage={null}
        isTestDisabled={false}
        availableModels={[{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }]}
        testModelId="gemini-2.5-pro"
        onModelChange={vi.fn()}
        t={t as any}
      />
    );

    expect(container).toHaveTextContent('测试模型');
  });

  it('uses localized fallback copy in shortcuts section', () => {
    const { container } = renderIntoDom(<ShortcutsSection t={t as any} />);

    expect(container).toHaveTextContent('快捷键配置暂不可用。');
  });

  it('uses localized footer copy in the safety section', () => {
    const { container } = renderIntoDom(
      <SafetySection safetySettings={undefined} setSafetySettings={vi.fn()} t={t as any} />
    );

    expect(container).toHaveTextContent('更改将应用于新消息。');
  });

  it('uses localized thinking-status copy for Gemma and off states', () => {
    const gemmaRender = renderIntoDom(
      <ThinkingControl
        modelId="gemma-4-31b-it"
        thinkingBudget={1024}
        setThinkingBudget={vi.fn()}
        showThoughts
        setShowThoughts={vi.fn()}
        t={t as any}
      />
    );

    expect(gemmaRender.container).toHaveTextContent('Gemma 4 使用 <|think|> token 启用思考模式。启用后，模型会在 <|channel|thought> 标签中输出推理内容。');
    expect(gemmaRender.container).toHaveTextContent('思考已启用');
    expect(gemmaRender.container).toHaveTextContent('将 <|think|> token 注入系统提示');

    act(() => {
      gemmaRender.root.unmount();
    });
    mountedRoots.pop();
    gemmaRender.container.remove();

    const offRender = renderIntoDom(
      <ThinkingControl
        modelId="gemini-2.5-pro"
        thinkingBudget={0}
        setThinkingBudget={vi.fn()}
        showThoughts={false}
        setShowThoughts={vi.fn()}
        t={t as any}
      />
    );

    expect(offRender.container).toHaveTextContent('思考过程已禁用。');
  });

  it('uses localized synchronous API config validation errors', () => {
    const { container } = renderIntoDom(
      <ApiConfigSection
        useCustomApiConfig={false}
        setUseCustomApiConfig={vi.fn()}
        apiKey={null}
        setApiKey={vi.fn()}
        apiProxyUrl={null}
        setApiProxyUrl={vi.fn()}
        useApiProxy={false}
        setUseApiProxy={vi.fn()}
        availableModels={[]}
        t={t as any}
      />
      );

      act(() => {
        const testButton = Array.from(container.querySelectorAll('button')).find((button) =>
          button.textContent?.includes('测试连通性')
        );
        testButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

    expect(container).toHaveTextContent('当前没有可用的 API 密钥。');
  });

  it('uses localized about-section status and stars labels', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stargazers_count: 1234 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tag_name: 'v1.8.4' }),
      } as Response);

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchMock,
    });

    try {
      const betaRender = renderIntoDom(<AboutSection t={t as any} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(betaRender.container).toHaveTextContent('v1.8.6');
      expect(betaRender.container).toHaveTextContent('测试版');
      expect(betaRender.container).toHaveTextContent('星标');

      act(() => {
        betaRender.root.unmount();
      });
      mountedRoots.pop();
      betaRender.container.remove();

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stargazers_count: 2345 }),
      } as Response).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tag_name: 'v1.9.0' }),
      } as Response);

      const updateRender = renderIntoDom(<AboutSection t={t as any} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(updateRender.container.querySelector('a[title="有新版本：v1.9.0"]')).toBeTruthy();
    } finally {
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        value: originalFetch,
      });
    }
  });

  it('uses localized back action in the scenario editor header', () => {
    const { container } = renderIntoDom(
      <ScenarioEditorHeader
        title="测试场景"
        setTitle={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onOpenSystemPrompt={vi.fn()}
        isSaveDisabled={false}
        readOnly={false}
        t={t as any}
      />
    );

    expect(container).toHaveTextContent('返回');
  });

  it('uses translated thinking toggle copy and valid focus-visible classes', () => {
    const { container } = renderIntoDom(
      <HeaderModelSelector
        currentModelName="Gemini 3.1 Flash"
        availableModels={[{ id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash' }]}
        selectedModelId="gemini-3.1-flash"
        onSelectModel={vi.fn()}
        isSwitchingModel={false}
        isLoading={false}
        t={t}
        thinkingLevel="MINIMAL"
        onSetThinkingLevel={vi.fn()}
      />
    );

    const toggle = container.querySelector('[aria-label="切换思考档位"]');
    expect(toggle).toHaveAttribute('title', '当前思考档位：极速');
    expect(toggle?.className).toContain('focus-visible:ring-2');
    expect(toggle?.className).not.toContain('focus:visible');
  });

  it('uses localized metadata for the new-group action', () => {
    const { container } = renderIntoDom(
      <SidebarActions
        onNewChat={vi.fn()}
        onAddNewGroup={vi.fn()}
        isSearching={false}
        searchQuery=""
        setIsSearching={vi.fn()}
        setSearchQuery={vi.fn()}
        t={t as any}
      />
    );

    expect(container.querySelector('button[title="新建分组"]')).toHaveAttribute('title', '新建分组');
  });

  it('uses a localized aria label for the app logo in the sidebar header', () => {
    const { container } = renderIntoDom(
      <SidebarHeader onToggle={vi.fn()} isOpen t={t as any} />
    );

    expect(container.querySelector('svg[aria-label="All Model Chat 标志"]')).toBeTruthy();
  });

  it('uses localized more-actions labels in session and group history items', () => {
    const sessionRender = renderIntoDom(
      <SessionItem
        session={{ id: 'session-1', title: '测试会话', isPinned: false } as any}
        activeSessionId={null}
        editingItem={null}
        activeMenu={null}
        loadingSessionIds={new Set()}
        generatingTitleSessionIds={new Set()}
        newlyTitledSessionId={null}
        editInputRef={{ current: null } as React.RefObject<HTMLInputElement>}
        menuRef={{ current: null } as React.RefObject<HTMLDivElement>}
        onSelectSession={vi.fn()}
        onTogglePinSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onDuplicateSession={vi.fn()}
        onOpenExportModal={vi.fn()}
        handleStartEdit={vi.fn()}
        handleRenameConfirm={vi.fn()}
        handleRenameKeyDown={vi.fn()}
        setEditingItem={vi.fn()}
        toggleMenu={vi.fn()}
        setActiveMenu={vi.fn()}
        handleDragStart={vi.fn()}
        t={t as any}
      />
    );

    expect(sessionRender.container.querySelector('button[title="更多操作"]')).toHaveAttribute(
      'aria-label',
      '更多操作'
    );

    act(() => {
      sessionRender.root.unmount();
    });
    mountedRoots.pop();
    sessionRender.container.remove();

    const groupRender = renderIntoDom(
      <GroupItem
        group={{ id: 'group-1', title: '测试分组', isExpanded: true } as any}
        sessions={[]}
        editingItem={null}
        dragOverId={null}
        activeSessionId={null}
        activeMenu={null}
        loadingSessionIds={new Set()}
        generatingTitleSessionIds={new Set()}
        newlyTitledSessionId={null}
        editInputRef={{ current: null } as React.RefObject<HTMLInputElement>}
        menuRef={{ current: null } as React.RefObject<HTMLDivElement>}
        onSelectSession={vi.fn()}
        onTogglePinSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onDuplicateSession={vi.fn()}
        onOpenExportModal={vi.fn()}
        handleStartEdit={vi.fn()}
        handleRenameConfirm={vi.fn()}
        handleRenameKeyDown={vi.fn()}
        setEditingItem={vi.fn()}
        toggleMenu={vi.fn()}
        setActiveMenu={vi.fn()}
        handleDragStart={vi.fn()}
        onToggleGroupExpansion={vi.fn()}
        handleGroupStartEdit={vi.fn()}
        handleDrop={vi.fn()}
        handleDragOver={vi.fn()}
        setDragOverId={vi.fn()}
        onDeleteGroup={vi.fn()}
        t={t as any}
      />
    );

    expect(groupRender.container.querySelector('button[title="更多操作"]')).toHaveAttribute(
      'aria-label',
      '更多操作'
    );
  });

  it('uses translated TTS context copy in the toolbar', () => {
    const { container } = renderIntoDom(
      <ChatInputToolbar
        isImagenModel={false}
        isTtsModel
        ttsVoice="Aoede"
        setTtsVoice={vi.fn()}
        fileError={null}
        showAddByIdInput={false}
        fileIdInput=""
        setFileIdInput={vi.fn()}
        onAddFileByIdSubmit={vi.fn()}
        onCancelAddById={vi.fn()}
        isAddingById={false}
        showAddByUrlInput={false}
        urlInput=""
        setUrlInput={vi.fn()}
        onAddUrlSubmit={vi.fn()}
        onCancelAddUrl={vi.fn()}
        isAddingByUrl={false}
        isLoading={false}
        t={t as any}
        ttsContext="cinematic"
        onEditTtsContext={vi.fn()}
      />
    );

    expect(container.querySelector('button[title="TTS 导演注释"]')).toHaveAttribute(
      'title',
      'TTS 导演注释'
    );
  });

  it('uses localized add-by-id helper text, cancel action, and quad-image label', () => {
    const { container } = renderIntoDom(
      <ChatInputToolbar
        isImagenModel
        isTtsModel={false}
        fileError={null}
        showAddByIdInput
        fileIdInput=""
        setFileIdInput={vi.fn()}
        onAddFileByIdSubmit={vi.fn()}
        onCancelAddById={vi.fn()}
        isAddingById={false}
        showAddByUrlInput={false}
        urlInput=""
        setUrlInput={vi.fn()}
        onAddUrlSubmit={vi.fn()}
        onCancelAddUrl={vi.fn()}
        isAddingByUrl={false}
        isLoading={false}
        t={t as any}
        generateQuadImages={false}
        onToggleQuadImages={vi.fn()}
      />
    );

    expect(container).toHaveTextContent('请输入有效的 Gemini API 文件 URI');
    expect(container).toHaveTextContent('files/888...');
    expect(container.querySelector('button[aria-label="取消"]')).toBeTruthy();
    expect(
      container.querySelector(
        'button[title="启用后，使用 Imagen 模型将一次性生成四张独立的图片变体。这将消耗更多 API 用量。"]'
      )
    ).toHaveTextContent('4 张图');
  });

  it('uses localized TTS context template in the editor modal', async () => {
    renderIntoDom(
      <ChatInputModals
        showRecorder={false}
        onAudioRecord={vi.fn()}
        onRecorderCancel={vi.fn()}
        showCreateTextFileEditor={false}
        onConfirmCreateTextFile={vi.fn()}
        onCreateTextFileCancel={vi.fn()}
        isHelpModalOpen={false}
        onHelpModalClose={vi.fn()}
        allCommandsForHelp={[]}
        isProcessingFile={false}
        isLoading={false}
        t={t as any}
        themeId="light"
        showTtsContextEditor
        onCloseTtsContextEditor={vi.fn()}
        ttsContext=""
        setTtsContext={vi.fn()}
      />
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const textarea = document.body.querySelector('textarea') as HTMLTextAreaElement | null;
    expect(document.body).toHaveTextContent('TTS 导演注释');
    expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('音频人设'));
    expect(textarea?.value).toContain('导演注释');
  });

  it('uses localized quote labels and remove action', () => {
    const { container } = renderIntoDom(
      <ChatQuoteDisplay
        quotes={['第一条引用', '第二条引用']}
        onRemoveQuote={vi.fn()}
        themeId="aurora"
        t={t as any}
      />
    );

    expect(container).toHaveTextContent('引用 1');
    expect(container).toHaveTextContent('引用 2');
    expect(container.querySelector('button[aria-label="删除引用"]')).toBeTruthy();
  });

  it('uses localized select placeholder when no option is selected', () => {
    useSettingsStore.setState({ language: 'zh' });
    const { container } = renderIntoDom(
      <Select id="empty-select" label="Empty Select" value="" onChange={vi.fn()}>
        <option value="gemini">Gemini</option>
      </Select>
    );

    expect(container).toHaveTextContent('请选择...');
  });

  it('allows the input action row to wrap on small screens', () => {
    const { container } = renderIntoDom(
      <ChatInputActions
        onAttachmentAction={vi.fn()}
        disabled={false}
        isGoogleSearchEnabled
        onToggleGoogleSearch={vi.fn()}
        isCodeExecutionEnabled
        onToggleCodeExecution={vi.fn()}
        isLocalPythonEnabled
        onToggleLocalPython={vi.fn()}
        isUrlContextEnabled
        onToggleUrlContext={vi.fn()}
        isDeepSearchEnabled
        onToggleDeepSearch={vi.fn()}
        onAddYouTubeVideo={vi.fn()}
        onCountTokens={vi.fn()}
        onRecordButtonClick={vi.fn()}
        isRecording={false}
        isMicInitializing={false}
        isTranscribing={false}
        isLoading={false}
        onStopGenerating={vi.fn()}
        isEditing={false}
        onCancelEdit={vi.fn()}
        canSend
        isWaitingForUpload={false}
        t={t as any}
        onCancelRecording={vi.fn()}
        onTranslate={vi.fn()}
        isTranslating={false}
        inputText="hello"
        onToggleFullscreen={vi.fn()}
        isFullscreen={false}
        onFastSendMessage={vi.fn()}
      />
    );

    expect(container.firstElementChild).toHaveClass('flex-wrap');
  });

  it('uses translated copy for scroll navigation controls', () => {
    const { container } = renderIntoDom(
      <ScrollNavigation
        showUp
        showDown
        onScrollToPrev={vi.fn()}
        onScrollToNext={vi.fn()}
        bottomOffset={120}
        t={t as any}
      />
    );

    expect(container.querySelector('button[title="滚动到上一条消息"]')).toHaveAttribute(
      'aria-label',
      '滚动到上一条消息'
    );
    expect(container.querySelector('button[title="滚动到底部"]')).toHaveAttribute(
      'aria-label',
      '滚动到底部'
    );
  });

  it('uses translated copy in the live status banner', () => {
    const { container } = renderIntoDom(
      <LiveStatusBanner
        isConnected
        isSpeaking
        volume={0.1}
        onDisconnect={vi.fn()}
        error={null}
        t={t as any}
      />
    );

    expect(container).toHaveTextContent('Gemini 正在说话...');
    expect(container).toHaveTextContent('实时会话已连接，可直接输入');
    expect(container.querySelector('button')).toHaveTextContent('结束通话');
  });

  it('uses localized export modal loading copy', () => {
    renderIntoDom(
      <ExportChatModal
        isOpen
        onClose={vi.fn()}
        onExport={vi.fn()}
        exportStatus="exporting"
        t={t as any}
      />
    );

    expect(document.body.querySelector('#export-chat-title')).toHaveTextContent('导出对话');
    expect(document.body.querySelector('button[aria-label="关闭导出对话框"]')).toBeTruthy();
    expect(document.body).toHaveTextContent('正在导出对话...');
    expect(document.body).toHaveTextContent('长对话或包含图片时可能需要一点时间。');
  });

  it('uses localized copy in the HTML preview header', () => {
    const HtmlPreviewHeaderWithTranslator = HtmlPreviewHeader as unknown as React.ComponentType<any>;

    renderIntoDom(
      <HtmlPreviewHeaderWithTranslator
        title="React Demo"
        scale={1}
        isTrueFullscreen={false}
        isScreenshotting={false}
        minZoom={0.5}
        maxZoom={2}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onRefresh={vi.fn()}
        onDownload={vi.fn()}
        onScreenshot={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onClose={vi.fn()}
        t={t}
      />
    );

    expect(document.body).toHaveTextContent('React 应用');
    expect(document.body.querySelector('button[title="缩小"]')).toBeTruthy();
    expect(document.body.querySelector('button[title="放大"]')).toBeTruthy();
    expect(document.body.querySelector('button[title="重新加载"]')).toBeTruthy();
    expect(document.body.querySelector('button[title="下载 HTML"]')).toBeTruthy();
    expect(document.body.querySelector('button[title="屏幕截图"]')).toBeTruthy();
    expect(document.body.querySelector('button[title="全屏"]')).toBeTruthy();
    expect(document.body.querySelector('button[title="关闭"]')).toBeTruthy();
  });

  it('uses localized navigation and fallback copy in the file preview modal', () => {
    const file: UploadedFile = {
      id: 'file-1',
      name: 'archive.bin',
      type: 'application/octet-stream',
      size: 4,
      dataUrl: 'data:application/octet-stream;base64,AA==',
    };

    renderIntoDom(
      <FilePreviewModal
        file={file}
        onClose={vi.fn()}
        t={t as any}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        hasPrev
        hasNext
      />
    );

    expect(document.body.querySelector('button[aria-label="上一个"]')).toBeTruthy();
    expect(document.body.querySelector('button[aria-label="下一个"]')).toBeTruthy();
    expect(document.body).toHaveTextContent('此文件类型暂不支持预览。');
  });

  it('uses localized YouTube preview copy in the file preview modal', () => {
    const file: UploadedFile = {
      id: 'file-2',
      name: 'clip.url',
      type: 'video/youtube-link',
      size: 0,
      fileUri: 'https://youtu.be/dQw4w9WgXcQ',
    };

    renderIntoDom(
      <FilePreviewModal
        file={file}
        onClose={vi.fn()}
        t={t as any}
      />
    );

    expect(document.body.querySelector('iframe[title="YouTube 视频播放器"]')).toBeTruthy();
  });

  it('uses localized copy in the message export modal and export options', () => {
    renderIntoDom(
      <ExportModal
        isOpen
        onClose={vi.fn()}
        onExport={vi.fn()}
        exportingType={null}
        t={t as any}
      />
    );

    expect(document.body.querySelector('button[aria-label="关闭导出对话框"]')).toBeTruthy();
    expect(document.body).toHaveTextContent('PNG 图片');
    expect(document.body).toHaveTextContent('网页格式');
    expect(document.body).toHaveTextContent('原始数据');
  });

  it('uses localized file preview header actions in browse mode', () => {
    const file: UploadedFile = {
      id: 'file-3',
      name: 'notes.txt',
      type: 'text/plain',
      size: 12,
      dataUrl: 'data:text/plain;base64,SGVsbG8=',
    };

    const { container } = renderIntoDom(
      <FilePreviewHeader
        file={file}
        onClose={vi.fn()}
        onToggleEdit={vi.fn()}
        onCopy={vi.fn()}
        isCopied={false}
        t={t}
      />
    );

    expect(container.querySelector('button[title="编辑文件"]')).toBeTruthy();
    expect(container.querySelector('button[title="复制内容"]')).toBeTruthy();
    expect(container.querySelector('button[title="下载文件"]')).toBeTruthy();
  });

  it('uses localized file preview header actions in edit mode', () => {
    const file: UploadedFile = {
      id: 'file-4',
      name: 'draft.txt',
      type: 'text/plain',
      size: 8,
      dataUrl: 'data:text/plain;base64,SGVsbG8=',
    };

    const { container } = renderIntoDom(
      <FilePreviewHeader
        file={file}
        onClose={vi.fn()}
        onToggleEdit={vi.fn()}
        onSave={vi.fn()}
        isEditable
        editedName="draft.txt"
        onNameChange={vi.fn()}
        t={t}
      />
    );

    expect(container.querySelector('input[placeholder="文件名"]')).toBeTruthy();
    expect(container.querySelector('button[title="保存更改"]')).toBeTruthy();
    expect(container.querySelector('button[title="取消编辑"]')).toBeTruthy();
  });

  it('uses localized titles for inline table actions', () => {
    const { container } = renderIntoDom(
      <TableBlock t={t as any}>
        <tbody>
          <tr>
            <td>Alpha</td>
          </tr>
        </tbody>
      </TableBlock>
    );

    expect(container.querySelector('button[title="复制 Markdown"]')).toBeTruthy();
    expect(container.querySelector('button[title="下载"]')).toBeTruthy();
    expect(container.querySelector('button[title="全屏"]')).toBeTruthy();
  });

  it('uses localized title for exiting table fullscreen', () => {
    const { container } = renderIntoDom(
      <TableBlock t={t as any}>
        <tbody>
          <tr>
            <td>Beta</td>
          </tr>
        </tbody>
      </TableBlock>
    );

    const fullscreenButton = container.querySelectorAll('button')[2];
    act(() => {
      fullscreenButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.querySelector('button[title="退出全屏"]')).toBeTruthy();
  });

  it('uses a localized fallback title in the HTML preview modal', () => {
    renderIntoDom(
      <HtmlPreviewModal
        isOpen
        onClose={vi.fn()}
        htmlContent="<div>Hello preview</div>"
        t={t as any}
      />
    );

    expect(document.body.querySelector('#html-preview-modal-title')).toHaveTextContent('HTML 预览');
  });

  it('uses localized code preview controls and fallback side-panel title', () => {
    const onOpenSidePanel = vi.fn();
    const { container } = renderIntoDom(
      <CodeBlock
        className="language-html"
        onOpenHtmlPreview={vi.fn()}
        expandCodeBlocksByDefault={false}
        t={t as any}
        onOpenSidePanel={onOpenSidePanel}
      >
        <code className="language-html">{'<div>Hello</div>'}</code>
      </CodeBlock>
    );

    const sidePanelButton = container.querySelector('button[title="在侧边栏打开"]');
    expect(sidePanelButton).toBeTruthy();
    expect(container.querySelector('button[title="下载 HTML"]')).toBeTruthy();

    act(() => {
      sidePanelButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onOpenSidePanel).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'HTML 预览',
      })
    );
  });

  it('uses localized copy for the Python run control', () => {
    const { container } = renderIntoDom(
      <CodeBlock
        className="language-python"
        onOpenHtmlPreview={vi.fn()}
        expandCodeBlocksByDefault={false}
        t={t as any}
        onOpenSidePanel={vi.fn()}
      >
        <code className="language-python">{'print("hello")'}</code>
      </CodeBlock>
    );

    expect(container.querySelector('button[title="运行 Python 代码"]')).toBeTruthy();
  });

  it('uses localized expand and collapse copy for overflowing code blocks', () => {
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return this.tagName === 'PRE' ? 500 : 0;
      },
    });

    try {
      const { container } = renderIntoDom(
        <CodeBlock
          className="language-ts"
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          t={t as any}
          onOpenSidePanel={vi.fn()}
        >
          <code className="language-ts">{'const value = 1;'}</code>
        </CodeBlock>
      );

      expect(container).toHaveTextContent('显示更多');
      const expandButton = container.querySelector('button[title="展开"]');
      expect(expandButton).toBeTruthy();

      act(() => {
        expandButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(container).toHaveTextContent('显示更少');
      expect(container.querySelector('button[title="收起代码块"]')).toBeTruthy();
    } finally {
      if (originalScrollHeight) {
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
      } else {
        delete (HTMLElement.prototype as any).scrollHeight;
      }
    }
  });

  it('uses localized copy in the code execution console', () => {
    mockedUsePyodide.mockReturnValue({
      isRunning: false,
      output: null,
      image: null,
      files: [],
      error: null,
      hasRun: true,
      runCode: vi.fn(),
      clearOutput: vi.fn(),
      resetState: vi.fn(),
    });

    const { container } = renderIntoDom(
      <CodeBlock
        className="language-python"
        onOpenHtmlPreview={vi.fn()}
        expandCodeBlocksByDefault={false}
        t={t as any}
        onOpenSidePanel={vi.fn()}
      >
        <code className="language-python">{'print("hello")'}</code>
      </CodeBlock>
    );

    expect(container).toHaveTextContent('本地 Python 输出');
    expect(container.querySelector('button[title="重置视图"]')).toBeTruthy();
    expect(container.querySelector('button[title="关闭控制台"]')).toBeTruthy();
    expect(container).toHaveTextContent('执行成功（无输出）。');
  });

  it('uses localized copy in the error boundary fallback', () => {
    useSettingsStore.setState({ language: 'zh' });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const Crash = () => {
      throw new Error('');
    };

    try {
      const { container } = renderIntoDom(
        <ErrorBoundary>
          <Crash />
        </ErrorBoundary>
      );

      expect(container).toHaveTextContent('出错了');
      expect(container).toHaveTextContent('发生了意外错误。');
      expect(container.querySelector('button')).toHaveTextContent('重新加载');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('uses localized image viewer controls and alt text', () => {
    const file: UploadedFile = {
      id: 'file-5',
      name: 'diagram.png',
      type: 'image/png',
      size: 12,
      dataUrl: 'data:image/png;base64,AA==',
    };

    const { container } = renderIntoDom(<ImageViewer file={file} t={t} />);

    expect(container.querySelector('img')).toHaveAttribute('alt', 'diagram.png 的缩放视图');
    expect(container.querySelector('button[title="缩小"]')).toBeTruthy();
    expect(container.querySelector('button[title="放大"]')).toBeTruthy();
    expect(container.querySelector('button[title="重置视图"]')).toBeTruthy();
  });

  it('uses localized PDF toolbar controls', () => {
    const { container } = renderIntoDom(
      <PdfToolbar
        currentPage={2}
        numPages={8}
        scale={1}
        showSidebar
        onPageInputCommit={vi.fn()}
        onPrevPage={vi.fn()}
        onNextPage={vi.fn()}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onRotate={vi.fn()}
        onToggleSidebar={vi.fn()}
        t={t}
      />
    );

    expect(container.querySelector('button[title="切换缩略图"]')).toBeTruthy();
    expect(container.querySelector('button[title="上一页"]')).toBeTruthy();
    expect(container.querySelector('input[aria-label="页码"]')).toBeTruthy();
    expect(container.querySelector('button[title="下一页"]')).toBeTruthy();
    expect(container.querySelector('button[title="缩小"]')).toBeTruthy();
    expect(container.querySelector('button[title="放大"]')).toBeTruthy();
    expect(container.querySelector('button[title="旋转"]')).toBeTruthy();
  });

  it('uses localized loading copy in the PDF main content', () => {
    const { container } = renderIntoDom(
      <PdfMainContent
        numPages={null}
        scale={1}
        rotation={0}
        isLoading
        error={null}
        setPageRef={vi.fn()}
        containerRef={React.createRef<HTMLDivElement>()}
        t={t as any}
      />
    );

    expect(container).toHaveTextContent('PDF 加载中...');
  });

  it('uses localized page placeholders in the PDF main content', () => {
    const originalIntersectionObserver = globalThis.IntersectionObserver;
    class MockIntersectionObserver {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    (globalThis as any).IntersectionObserver = MockIntersectionObserver;

    try {
      const { container } = renderIntoDom(
        <PdfMainContent
          numPages={1}
          scale={1}
          rotation={0}
          isLoading={false}
          error={null}
          setPageRef={vi.fn()}
          containerRef={React.createRef<HTMLDivElement>()}
          t={t as any}
        />
      );

      expect(container).toHaveTextContent('第 1 页');
    } finally {
      if (originalIntersectionObserver) {
        globalThis.IntersectionObserver = originalIntersectionObserver;
      } else {
        delete (globalThis as any).IntersectionObserver;
      }
    }
  });

  it('uses localized loading and error copy in the text file viewer', async () => {
    const file: UploadedFile = {
      id: 'file-6',
      name: 'notes.txt',
      type: 'text/plain',
      size: 10,
      dataUrl: 'blob:text',
    };

    const loadingFetch = new Promise<Response>(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(loadingFetch as Promise<Response>);
    const { container } = renderIntoDom(<TextFileViewer file={file} t={t} />);

    expect(container).toHaveTextContent('加载内容中...');

    fetchSpy.mockRejectedValueOnce(new Error('boom'));
    act(() => {
      mountedRoots[mountedRoots.length - 1].root.unmount();
    });
    mountedRoots.pop();
    container.remove();

    const secondRender = renderIntoDom(<TextFileViewer file={{ ...file, id: 'file-7' }} t={t} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(secondRender.container).toHaveTextContent('文件内容加载失败。');
    fetchSpy.mockRestore();
  });

  it('uses a localized fallback error in the PDF viewer hook', () => {
    const file: UploadedFile = {
      id: 'file-9',
      name: 'report.pdf',
      type: 'application/pdf',
      size: 10,
      dataUrl: 'blob:pdf',
    };

    const hookStateRef: { current: ReturnType<typeof usePdfViewer> | null } = { current: null };
    const HookHarness = () => {
      const hookState = usePdfViewer(file, t as any);
      React.useEffect(() => {
        hookStateRef.current = hookState;
      }, [hookState]);
      return <span>{hookState.error}</span>;
    };

    const { container } = renderIntoDom(<HookHarness />);

    act(() => {
      hookStateRef.current!.onDocumentLoadError(new Error(''));
    });

    expect(container).toHaveTextContent('PDF 加载失败。');
  });

  it('uses a localized title for the HTML preview iframe', () => {
    const iframeRef = React.createRef<HTMLIFrameElement>();
    const { container } = renderIntoDom(
      <HtmlPreviewContent iframeRef={iframeRef} htmlContent="<div>Hello</div>" scale={1} t={t} />
    );

    expect(container.querySelector('iframe')).toHaveAttribute('title', 'HTML 预览内容');
  });

  it('uses a localized alert when HTML preview screenshot capture fails', async () => {
    mockedExportElementAsPng.mockRejectedValueOnce(new Error('boom'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    try {
      renderIntoDom(
        <HtmlPreviewModal
          isOpen
          onClose={vi.fn()}
          htmlContent="<div>Hello preview</div>"
          t={t as any}
        />
      );

      const iframe = document.body.querySelector('iframe') as HTMLIFrameElement | null;
      if (iframe && !iframe.contentDocument) {
        Object.defineProperty(iframe, 'contentDocument', {
          configurable: true,
          value: document.implementation.createHTMLDocument('preview'),
        });
      }

      await act(async () => {
        document.body
          .querySelector('button[title="屏幕截图"]')!
          .dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });

      expect(alertSpy).toHaveBeenCalledWith('截图失败，请检查控制台了解详情。');
    } finally {
      alertSpy.mockRestore();
    }
  });

  it('uses a localized alert when file preview copy fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('boom'));
    const file: UploadedFile = {
      id: 'file-8',
      name: 'clip.png',
      type: 'image/png',
      size: 10,
      dataUrl: 'blob:copy',
    };

    try {
      const { container } = renderIntoDom(<FilePreviewHeader file={file} onClose={vi.fn()} t={t} />);

      await act(async () => {
        container
          .querySelector('button[title="复制内容"]')!
          .dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });

      expect(alertSpy).toHaveBeenCalledWith('复制失败。浏览器可能不支持此功能或需要额外权限。');
    } finally {
      fetchSpy.mockRestore();
      alertSpy.mockRestore();
    }
  });

  it('uses localized alt text for generated code execution images', () => {
    mockedUsePyodide.mockReturnValue({
      isRunning: false,
      output: null,
      image: 'ZmFrZQ==',
      files: [],
      error: null,
      hasRun: true,
      runCode: vi.fn(),
      clearOutput: vi.fn(),
      resetState: vi.fn(),
    });

    const { container } = renderIntoDom(
      <CodeBlock
        className="language-python"
        onOpenHtmlPreview={vi.fn()}
        expandCodeBlocksByDefault={false}
        t={t as any}
        onOpenSidePanel={vi.fn()}
      >
        <code className="language-python">{'print("plot")'}</code>
      </CodeBlock>
    );

    expect(container.querySelector('img')).toHaveAttribute('alt', '绘图结果');
  });
});
