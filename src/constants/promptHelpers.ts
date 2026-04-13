export const CANVAS_PROMPT_MARKER = '<title>Canvas 助手：响应式视觉指南</title>';
export const LOCAL_PYTHON_PROMPT_MARKER = '[LOCAL PYTHON ENVIRONMENT ACTIVATED]';
export const BBOX_PROMPT_MARKER = '**任务：** 请作为一位计算机视觉专家';
export const HD_GUIDE_PROMPT_MARKER = '### 系统提示词：高清引导标注专家';

export const isCanvasSystemInstruction = (instruction?: string | null) =>
  !!instruction && instruction.includes(CANVAS_PROMPT_MARKER);

export const isLocalPythonSystemInstruction = (instruction?: string | null) =>
  !!instruction && instruction.includes(LOCAL_PYTHON_PROMPT_MARKER);

export const isBboxSystemInstruction = (instruction?: string | null) =>
  !!instruction && instruction.includes(BBOX_PROMPT_MARKER);

export const isHdGuideSystemInstruction = (instruction?: string | null) =>
  !!instruction && instruction.includes(HD_GUIDE_PROMPT_MARKER);

export const loadCanvasSystemPrompt = async () =>
  (await import('./prompts/canvas')).CANVAS_SYSTEM_PROMPT;

export const loadDeepSearchSystemPrompt = async () =>
  (await import('./prompts/deepSearch')).DEEP_SEARCH_SYSTEM_PROMPT;

export const loadLocalPythonSystemPrompt = async () =>
  (await import('./promptConstants')).LOCAL_PYTHON_SYSTEM_PROMPT;

export const loadBboxSystemPrompt = async () =>
  (await import('./promptConstants')).BBOX_SYSTEM_PROMPT;

export const loadHdGuideSystemPrompt = async () =>
  (await import('./promptConstants')).HD_GUIDE_SYSTEM_PROMPT;
