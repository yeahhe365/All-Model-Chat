import { AppSettings } from '../types';

export const DEFAULT_MODEL_ID = 'gemini-2.5-flash'; 

export const TAB_CYCLE_MODELS: string[] = [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite-preview-06-17',
];

export const DEFAULT_SYSTEM_INSTRUCTION = '';

export const CANVAS_ASSISTANT_SYSTEM_PROMPT = `You are an expert web developer and designer. Your sole purpose is to generate complete, valid, and visually appealing HTML documents based on user requests.

**Core Requirement:**
EVERY response you provide MUST be a single, complete, and valid HTML document. It must start with \`<!DOCTYPE html>\` and end with \`</html>\`. ALL content must be inside this structure. The final output must be a markdown code block containing only the HTML.

**Functionality to Include:**
- **Styling:** All CSS must be inside a \`<style>\` tag in the \`<head>\`. Design should be modern, clean, and responsive.
- **Responsiveness:** The layout MUST adapt to different screen sizes (mobile, tablet, desktop).
- **Icons:** Use Google Material Icons where appropriate to enhance user experience.
- **JavaScript:** All JS for interactivity (like copy buttons, graph controls) must be inside a \`<script>\` tag before \`</body>\`. Ensure functionality like code copying works.
- **Mathematics (if requested):** Render LaTeX math using MathJax. Use \`\\(...\` for inline math and \`\\[...\\]\` for display math. Include the MathJax CDN script.
- **Code Blocks (if requested):** Use \`<pre><code class="language-...">\` for code. Use Prism.js for syntax highlighting. The page should handle loading Prism and highlighting code.
- **Visualizations (if requested):**
    - For charts and graphs, use ECharts. Include the necessary CDN script.
    - For diagrams (like flowcharts), use Graphviz with the DOT language, rendered on the client-side using Viz.js. The generated DOT code must not use CSS variables for colors.`;


export const DEFAULT_TEMPERATURE = 1.0; 
export const DEFAULT_TOP_P = 0.95; 
export const DEFAULT_SHOW_THOUGHTS = true;
export const DEFAULT_IS_STREAMING_ENABLED = true; 
export const DEFAULT_BASE_FONT_SIZE = 16; 
export const DEFAULT_TTS_VOICE = 'Zephyr';
export const DEFAULT_THINKING_BUDGET = -1; // -1 for auto/unlimited budget
export const DEFAULT_TRANSCRIPTION_MODEL_ID = 'gemini-2.5-flash';
export const DEFAULT_TRANSCRIPTION_THINKING_ENABLED = false;

export const AVAILABLE_TRANSCRIPTION_MODELS: { id: string; name: string }[] = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Default)' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Higher Quality)' },
    { id: 'gemini-2.5-flash-lite-preview-06-17', name: 'Gemini 2.5 Flash Lite (Fastest)' },
];

export const AVAILABLE_TTS_VOICES: { id: string; name: string }[] = [
    { id: 'Zephyr', name: 'Zephyr (Bright)' },
    { id: 'Puck', name: 'Puck (Upbeat)' },
    { id: 'Charon', name: 'Charon (Informative)' },
    { id: 'Kore', name: 'Kore (Firm)' },
    { id: 'Fenrir', name: 'Fenrir (Excitable)' },
    { id: 'Leda', name: 'Leda (Youthful)' },
    { id: 'Orus', name: 'Orus (Firm)' },
    { id: 'Aoede', name: 'Aoede (Breezy)' },
    { id: 'Callirrhoe', name: 'Callirrhoe (Easy-going)' },
    { id: 'Autonoe', name: 'Autonoe (Bright)' },
    { id: 'Enceladus', name: 'Enceladus (Breathy)' },
    { id: 'Iapetus', name: 'Iapetus (Clear)' },
    { id: 'Umbriel', name: 'Umbriel (Easy-going)' },
    { id: 'Algieba', name: 'Algieba (Smooth)' },
    { id: 'Despina', name: 'Despina (Smooth)' },
    { id: 'Erinome', name: 'Erinome (Clear)' },
    { id: 'Algenib', name: 'Algenib (Gravelly)' },
    { id: 'Rasalgethi', name: 'Rasalgethi (Informative)' },
    { id: 'Laomedeia', name: 'Laomedeia (Upbeat)' },
    { id: 'Achernar', name: 'Achernar (Soft)' },
    { id: 'Alnilam', name: 'Alnilam (Firm)' },
    { id: 'Schedar', name: 'Schedar (Even)' },
    { id: 'Gacrux', name: 'Gacrux (Mature)' },
    { id: 'Pulcherrima', name: 'Pulcherrima (Forward)' },
    { id: 'Achird', name: 'Achird (Friendly)' },
    { id: 'Zubenelgenubi', name: 'Zubenelgenubi (Casual)' },
    { id: 'Vindemiatrix', name: 'Vindemiatrix (Gentle)' },
    { id: 'Sadachbia', name: 'Sadachbia (Lively)' },
    { id: 'Sadaltager', name: 'Sadaltager (Knowledgeable)' },
    { id: 'Sulafat', name: 'Sulafat (Warm)' },
];

// localStorage keys
export const APP_SETTINGS_KEY = 'chatAppSettings';
export const PRELOADED_SCENARIO_KEY = 'chatPreloadedScenario';
export const CHAT_HISTORY_SESSIONS_KEY = 'chatHistorySessions';
export const ACTIVE_CHAT_SESSION_ID_KEY = 'activeChatSessionId';

export const DEFAULT_CHAT_SETTINGS = {
  modelId: DEFAULT_MODEL_ID,
  temperature: DEFAULT_TEMPERATURE,
  topP: DEFAULT_TOP_P,
  showThoughts: DEFAULT_SHOW_THOUGHTS,
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
  ttsVoice: DEFAULT_TTS_VOICE,
  thinkingBudget: DEFAULT_THINKING_BUDGET,
  lockedApiKey: null,
  isGoogleSearchEnabled: false,
  isCodeExecutionEnabled: false,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_CHAT_SETTINGS,
  themeId: 'pearl', // Corresponds to DEFAULT_THEME_ID from themeConstants
  baseFontSize: DEFAULT_BASE_FONT_SIZE,
  useCustomApiConfig: false,
  apiKey: null,
  apiProxyUrl: null,
  language: 'system',
  isStreamingEnabled: DEFAULT_IS_STREAMING_ENABLED,
  transcriptionModelId: DEFAULT_TRANSCRIPTION_MODEL_ID,
  isTranscriptionThinkingEnabled: DEFAULT_TRANSCRIPTION_THINKING_ENABLED,
  useFilesApiForImages: false,
  expandCodeBlocksByDefault: false,
};
