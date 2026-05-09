import { LOCAL_PYTHON_SYSTEM_PROMPT } from '@/features/prompts/localPython';

type PromptLanguage = 'en' | 'zh';

const CANVAS_PROMPT_MARKERS = [
  '[Canvas Artifact Protocol]',
  '[Canvas Artifact Protocol - zh]',
  '[Canvas Artifact Protocol - en]',
  '[Canvas Artifact Protocol v2]',
  '[Canvas Artifact Protocol v2 - zh]',
  '[Canvas Artifact Protocol v2 - en]',
  '<title>Canvas 助手：响应式视觉指南</title>',
  '<title>Canvas Assistant: Responsive Visual Guide</title>',
];
const BBOX_PROMPT_MARKER = '**任务：** 请作为一位计算机视觉专家';
const HD_GUIDE_PROMPT_MARKER = '### 系统提示词：高清引导标注专家';

export const isCanvasSystemInstruction = (instruction?: string | null) =>
  !!instruction && CANVAS_PROMPT_MARKERS.some((marker) => instruction.includes(marker));

export const isBboxSystemInstruction = (instruction?: string | null) =>
  !!instruction && instruction.includes(BBOX_PROMPT_MARKER);

export const isHdGuideSystemInstruction = (instruction?: string | null) =>
  !!instruction && instruction.includes(HD_GUIDE_PROMPT_MARKER);

export const loadCanvasSystemPrompt = async (language: PromptLanguage = 'zh') => {
  const prompts = await import('@/features/prompts/canvas');
  return language === 'en' ? prompts.CANVAS_SYSTEM_PROMPT_EN : prompts.CANVAS_SYSTEM_PROMPT_ZH;
};

export const loadDeepSearchSystemPrompt = async () =>
  (await import('@/features/prompts/deepSearch')).DEEP_SEARCH_SYSTEM_PROMPT;

export const loadLocalPythonSystemPrompt = async () => LOCAL_PYTHON_SYSTEM_PROMPT;

export const loadBboxSystemPrompt = async () => (await import('@/features/prompts/vision')).BBOX_SYSTEM_PROMPT;

export const loadHdGuideSystemPrompt = async () => (await import('@/features/prompts/vision')).HD_GUIDE_SYSTEM_PROMPT;
