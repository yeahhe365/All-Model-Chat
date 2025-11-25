
export const messagesTranslations = {
    // MessageList.tsx and sub-components
    imageZoom_title: { en: 'Zoomed Image: {filename}', zh: '图片缩放: {filename}' },
    imageZoom_close_aria: { en: 'Close image zoom view', zh: '关闭图片缩放视图' },
    imageZoom_close_title: { en: 'Close (Esc)', zh: '关闭 (Esc)' },
    welcome_greeting: { en: 'How can I help you today?', zh: '有什么可以帮忙的？' },
    welcome_suggestion_title: { en: 'Suggested', zh: '建议' },
    suggestion_summarize_title: { en: 'Summarize article', zh: '一句话概括' },
    suggestion_summarize_desc: { 
        en: 'Please read the following content and distill its core theme into a single sentence. This sentence should include key elements (who, did what, what was the result) and remain concise and powerful:', 
        zh: '请阅读以下内容，并用一句话精准提炼其核心主旨。这一句话需要包含关键要素（谁、做了什么、结果如何），保持简练有力：' 
    },
    suggestion_summarize_short: { en: 'Quickly extract the core theme.', zh: '快速提炼核心主旨。' },
    suggestion_organize_title: { en: 'Organize Information', zh: '信息整理' },
    suggestion_organize_desc: { 
        en: 'As an information organization expert, please de-duplicate, categorize, and structure the following content. Extract key points, ignore irrelevant details, and make the logic clear and readable:', 
        zh: '作为信息整理专家，请对以下内容进行去重、分类和结构化整理。请提取关键点，忽略无关细节，使逻辑清晰易读：' 
    },
    suggestion_organize_short: { en: 'Structure and categorize messy info.', zh: '结构化整理杂乱信息。' },
    suggestion_translate_title: { en: 'Bilingual Translation', zh: '中英互译' },
    suggestion_translate_desc: { 
        en: `You are a professional translator proficient in Chinese and English. Please translate the following text (Chinese to English, or English to Chinese). Aim for accuracy, fluency, and elegance, preserving the original meaning and tone. Do not add any explanations or extra symbols:`, 
        zh: `你是一位精通中英文的专业翻译。请将以下文本进行互译（中文转英文，英文转中文）。要求信达雅，保留原意和语气，不要添加任何解释或多余的符号：` 
    },
    suggestion_translate_short: { en: 'Professional bidirectional translation.', zh: '专业的中英双向互译。' },
    suggestion_ocr_title: { en: 'OCR', zh: 'OCR' },
    suggestion_ocr_desc: { 
        en: 'Please recognize and extract all text content from the attached image. Maintain original formatting and paragraph structure. If it contains tables, output them in Markdown table format. Do not add any opening or closing remarks:', 
        zh: '请识别并提取附加图片中的所有文字内容。保持原始排版和段落结构，如果包含表格请使用Markdown表格格式输出。不要添加任何开场白或结束语：' 
    },
    suggestion_ocr_short: { en: 'Extract text from images.', zh: '提取图片中的文字内容。' },
    suggestion_explain_title: { en: 'Explain Concept', zh: '概念解释' },
    suggestion_explain_desc: { 
        en: 'Please explain the following concept in simple language. Use analogies or real-life examples to aid understanding, avoiding overly technical jargon so that a beginner with no prior knowledge can easily grasp it:', 
        zh: '请用通俗易懂的语言解释以下概念。使用类比或生活中的例子来帮助理解，避免使用过于专业的术语，使零基础的初学者也能轻松掌握：' 
    },
    suggestion_explain_short: { en: 'Simplify complex concepts.', zh: '通俗易懂地解释复杂概念。' },
    suggestion_prompt_label: { en: 'Prompt', zh: '提示' },
    welcome_title: { en: 'Welcome to All Model Chat', zh: '欢迎使用 All Model Chat' },
    welcome_p1: { en: 'Start a conversation by typing below. You can also attach files, load scenarios via the', zh: '在下方输入文字开始对话。您也可以附加文件，或通过' },
    welcome_p2: { en: 'Manage Scenarios', zh: '管理场景' },
    welcome_p3: { en: 'button, or configure settings.', zh: '按钮加载场景，或进行设置。' },
    retry_button_title: { en: 'Retry', zh: '重试' },
    retry_and_stop_button_title: { en: 'Stop and Retry', zh: '停止并重试' },
    copy_button_title: { en: 'Copy content', zh: '复制内容' },
    copied_button_title: { en: 'Copied!', zh: '已复制！' },
    export_as_title: { en: 'Export as {type}', zh: '导出为 {type}' },
    exporting_title: { en: 'Exporting {type}...', zh: '正在导出 {type}...' },
    exported_title: { en: '{type} Exported!', zh: '{type} 已导出！' },
    export_failed_title: { en: 'Export failed.', zh: '导出失败。' },
    tokens_unit: { en: 'tokens', zh: '个令牌' },
    thinking_text: { en: 'Thinking...', zh: '思考中...' },
    thinking_took_time: { en: 'Thought for {seconds} seconds', zh: '已思考 {seconds} 秒' },
    cancelled_by_user: { en: '[Cancelled by user]', zh: '[用户已取消]' },
    stopped_by_user: { en: '[Stopped by user]', zh: '[用户已停止]' },
    empty_response_error: { en: 'The model did not provide a response. This might be due to safety filters or other content restrictions.', zh: '模型未提供任何回复。这可能是由于安全过滤器或其他内容限制所致。' },
    code_fullscreen_monitor: { en: 'Monitor Fullscreen', zh: '显示器全屏' },
    code_fullscreen_modal: { en: 'Preview Overlay', zh: '预览弹窗' },
};