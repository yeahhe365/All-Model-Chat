


import { ModelOption, AppSettings } from './types'; 

export const DEFAULT_MODEL_ID = 'gemini-2.5-pro'; 

const MARKDOWN_FORMATTING_INSTRUCTIONS = ``; 

export const DEFAULT_SYSTEM_INSTRUCTION = MARKDOWN_FORMATTING_INSTRUCTIONS;

export const DEFAULT_TEMPERATURE = 1.0; 
export const DEFAULT_TOP_P = 0.95; 
export const DEFAULT_SHOW_THOUGHTS = true;
export const DEFAULT_IS_STREAMING_ENABLED = true; 
export const DEFAULT_BASE_FONT_SIZE = 18; 

export const SUPPORTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
export const SUPPORTED_TEXT_MIME_TYPES = [
  'text/html',
  'text/plain',
  'application/javascript',
  'text/javascript', 
  'text/css',
  'application/json',
  'application/xml',
  'text/xml', 
  'text/markdown',
];
export const SUPPORTED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/ogg',
  'video/quicktime', 
  'video/x-msvideo', 
  'video/x-matroska', 
  'video/flv',
];
export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg', 
  'audio/ogg',
  'audio/wav',
  'audio/aac',
  'audio/webm', 
  'audio/flac',
  'audio/mp4', 
];
export const SUPPORTED_PDF_MIME_TYPES = ['application/pdf']; // Added PDF

export const ALL_SUPPORTED_MIME_TYPES = [
    ...SUPPORTED_IMAGE_MIME_TYPES, 
    ...SUPPORTED_TEXT_MIME_TYPES,
    ...SUPPORTED_VIDEO_MIME_TYPES,
    ...SUPPORTED_AUDIO_MIME_TYPES,
    ...SUPPORTED_PDF_MIME_TYPES, // Added PDF
];


export interface ThemeColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgAccent: string;
  bgAccentHover: string;
  bgDanger: string;
  bgDangerHover: string;
  bgInput: string;
  bgCodeBlock: string;
  bgCodeBlockHeader: string;
  bgUserMessage: string;
  bgModelMessage: string;
  bgErrorMessage: string;
  bgSuccess: string;
  textSuccess: string;
  bgInfo: string;
  textInfo: string;
  bgWarning: string;
  textWarning: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textAccent: string; 
  textDanger: string; 
  textLink: string;
  textCode: string;
  bgUserMessageText: string;
  bgModelMessageText: string;
  bgErrorMessageText: string;


  // Borders
  borderPrimary: string;
  borderSecondary: string;
  borderFocus: string;

  // Scrollbar
  scrollbarThumb: string;
  scrollbarTrack: string;

  // Icons
  iconUser: string;
  iconModel: string;
  iconError: string;
  iconThought: string; 
  iconSettings: string; 
  iconClearChat: string; 
  iconSend: string; 
  iconAttach: string; 
  iconStop: string; 
  iconEdit: string; 
  iconHistory: string; 
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export const DARK_THEME_COLORS: ThemeColors = {
  bgPrimary: '#111827',      
  bgSecondary: '#1f2937',    
  bgTertiary: '#374151',     
  bgAccent: '#0ea5e9',       
  bgAccentHover: '#0284c7',  
  bgDanger: '#dc2626',       
  bgDangerHover: '#b91c1c',  
  bgInput: '#374151',        
  bgCodeBlock: 'rgba(0, 0, 0, 0.3)', 
  bgCodeBlockHeader: 'rgba(17, 24, 39, 0.7)', 
  bgUserMessage: '#0ea5e9',   
  bgModelMessage: '#374151',  
  bgErrorMessage: '#ef4444',  
  bgSuccess: 'rgba(22, 163, 74, 0.2)', 
  textSuccess: '#4ade80',          
  bgInfo: 'rgba(14, 165, 233, 0.15)',
  textInfo: '#7dd3fc',             
  bgWarning: 'rgba(245, 158, 11, 0.15)', 
  textWarning: '#facc15',           

  textPrimary: '#f3f4f6',    
  textSecondary: '#d1d5db',  
  textTertiary: '#9ca3af',   
  textAccent: '#ffffff',
  textDanger: '#ffffff',
  textLink: '#38bdf8',       
  textCode: '#86efac',       
  bgUserMessageText: '#ffffff',
  bgModelMessageText: '#f3f4f6', 
  bgErrorMessageText: '#ffffff',

  borderPrimary: '#374151',  
  borderSecondary: '#4b5563',
  borderFocus: '#0ea5e9',    

  scrollbarThumb: '#4b5563', 
  scrollbarTrack: '#1f2937', 

  iconUser: '#38bdf8',       
  iconModel: '#34d399',      
  iconError: '#f87171',      
  iconThought: '#7dd3fc',    
  iconSettings: '#d1d5db',   
  iconClearChat: '#ffffff',  
  iconSend: '#ffffff',       
  iconAttach: '#d1d5db',     
  iconStop: '#ffffff',       
  iconEdit: '#d1d5db',
  iconHistory: '#d1d5db',
};

export const LIGHT_THEME_COLORS: ThemeColors = {
  bgPrimary: '#f9fafb',      
  bgSecondary: '#f3f4f6',    
  bgTertiary: '#ffffff',     
  bgAccent: '#0ea5e9',       
  bgAccentHover: '#0284c7',  
  bgDanger: '#ef4444',       
  bgDangerHover: '#dc2626',  
  bgInput: '#ffffff',        
  bgCodeBlock: '#f3f4f6',    
  bgCodeBlockHeader: 'rgba(229, 231, 235, 0.9)', 
  bgUserMessage: '#0ea5e9',   
  bgModelMessage: '#e5e7eb',  
  bgErrorMessage: '#fee2e2',  
  bgSuccess: '#dcfce7',       
  textSuccess: '#15803d',     
  bgInfo: '#e0f2fe',          
  textInfo: '#075985',        
  bgWarning: '#fef3c7',       
  textWarning: '#b45309',     

  textPrimary: '#1f2937',    
  textSecondary: '#4b5563',  
  textTertiary: '#6b7280',   
  textAccent: '#ffffff',
  textDanger: '#991b1b',     
  textLink: '#0369a1',       
  textCode: '#c026d3',       
  bgUserMessageText: '#ffffff',
  bgModelMessageText: '#1f2937', 
  bgErrorMessageText: '#991b1b', 

  borderPrimary: '#e5e7eb',  
  borderSecondary: '#d1d5db',
  borderFocus: '#0ea5e9',    

  scrollbarThumb: '#d1d5db', 
  scrollbarTrack: '#f3f4f6', 

  iconUser: '#0369a1',       
  iconModel: '#047857',      
  iconError: '#b91c1c',      
  iconThought: '#0369a1',    
  iconSettings: '#4b5563',   
  iconClearChat: '#ffffff',  
  iconSend: '#ffffff',       
  iconAttach: '#4b5563',     
  iconStop: '#ffffff',       
  iconEdit: '#4b5563',
  iconHistory: '#4b5563',
};


export const AVAILABLE_THEMES: Theme[] = [
  { id: 'dark', name: 'Dark', colors: DARK_THEME_COLORS },
  { id: 'light', name: 'Light (Default)', colors: LIGHT_THEME_COLORS },
];

export const DEFAULT_THEME_ID = 'light';

export const PRELOADED_SCENARIO_KEY = 'chatPreloadedScenario';
export const CHAT_HISTORY_SESSIONS_KEY = 'chatHistorySessions';
export const ACTIVE_CHAT_SESSION_ID_KEY = 'activeChatSessionId';

export const DEFAULT_CHAT_SETTINGS = {
  modelId: DEFAULT_MODEL_ID,
  temperature: DEFAULT_TEMPERATURE,
  topP: DEFAULT_TOP_P,
  showThoughts: DEFAULT_SHOW_THOUGHTS,
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_CHAT_SETTINGS,
  themeId: DEFAULT_THEME_ID,
  baseFontSize: DEFAULT_BASE_FONT_SIZE,
  useCustomApiConfig: false, // Default to using environment variables
  apiKey: null,
  apiUrl: null,
};

export const CANVAS_ASSISTANT_SYSTEM_PROMPT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Canvas 助手</title>
<script>MathJax={chtml:{fontURL:'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2'}}</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js" id="MathJax-script" async></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/viz.js/2.1.2/viz.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/viz.js/2.1.2/full.render.js" defer></script>
<script src="https://unpkg.com/@panzoom/panzoom@4.5.1/dist/panzoom.min.js" defer></script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet">
<style>html,body{height:100%;margin:0;scroll-behavior:smooth}body{font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;line-height:1.7;background-color:#f8faff;color:#374151;padding:10px;box-sizing:border-box;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}.container{max-width:1100px;margin:10px auto;padding:20px;background-color:#fff;border-radius:.45rem;box-shadow:0 .4rem 1.2rem rgba(0,0,0,.06)}.material-icons-outlined{vertical-align:middle;font-size:1.15em;margin-right:.3em;line-height:1}h1>.material-icons-outlined,h2>.material-icons-outlined{font-size:1.1em;margin-right:.4em;color:#007bff}h3>.material-icons-outlined,h4>.material-icons-outlined,h5>.material-icons-outlined{font-size:1.1em;margin-right:.4em;color:#4a5568}h1,h2,h3,h4,h5{color:#1f2937;margin:1.8em 0 1em;font-weight:600;display:flex;align-items:center;line-height:1.3}h1{font-size:2.6rem;letter-spacing:-.7px;border-bottom:1px solid #dde2e9;padding-bottom:.5em;margin:0 0 .8em}h2{font-size:2.1rem;border-bottom:1px solid #eef2f5;padding-bottom:.55em}h3{font-size:1.7rem}h4{font-size:1.35rem;color:#525860}.prompt-container h5{font-size:1.1rem;margin:1.8em 0 1em;padding-bottom:.3em;border-bottom:1px solid #e0e6ed}.sub-topic-heading{font-weight:600;margin-top:1.5em;margin-bottom:.7em;font-size:1.1rem;display:flex;align-items:center;line-height:1.4}.sub-topic-heading .material-icons-outlined{font-size:1.2em;margin-right:.4em}.text-primary{color:#007bff}.text-secondary{color:#525860}.text-accent1{color:#17a2b8}.text-accent2{color:#28a745}.text-accent3{color:#ffc107}.text-danger{color:#dc3545;font-weight:700}.text-warning{color:#ff8f00;font-weight:700}.text-highlight-green{color:#20c997;font-weight:600}.text-highlight-blue{color:#339AF0;font-weight:600}.text-highlight-purple{color:#AE3EC9;font-weight:600}p{margin-bottom:1.4em;color:#4b5563;font-size:1.05rem}strong,.strong-emphasis{font-weight:600;color:#007bff}.prompt-container strong{color:#2d3748}.prompt-container .strong-emphasis{color:#0056b3}.math-formula{font-size:1.3em;padding:10px;background-color:#f0f3f7;border-radius:.45rem;text-align:center;margin:15px 0;overflow-x:auto;border:1px solid #dfe5ec}.prompt-container .math-formula{margin:1.5em 0 1.8em}.two-col-grid-container .col .math-formula{margin-top:.5em;margin-bottom:0;font-size:1.1em}pre[class*=language-]{padding:1.7em;margin:1.2em 0;overflow:auto;border-radius:.45rem;box-shadow:0 4px 12px rgba(0,0,0,.08);border:1px solid #dde2e9;background:#2d2d2d}code[class*=language-],pre[class*=language-]{font-family:"Fira Code","SFMono-Regular",Consolas,"Liberation Mono",Menlo,Courier,monospace;font-size:.93rem;line-height:1.5}:not(pre)>code{font-family:"Fira Code","SFMono-Regular",Consolas,"Liberation Mono",Menlo,Courier,monospace;background-color:#f8f0f2;padding:.2em .4em;border-radius:.25rem;font-size:.9em;color:#bf0045;border:1px solid #f0e4e7}.code-wrapper{position:relative;margin:1.2em 0}.prompt-container .code-wrapper{margin:1.5em 0 2em}.code-wrapper pre[class*=language-]{margin:0!important;padding-right:65px}.copy-button{position:absolute;top:.8em;right:.8em;z-index:5;padding:6px 12px;background-color:rgba(80,80,80,.8);color:#f0f4f8;border:1px solid rgba(255,255,255,.1);border-radius:.35rem;cursor:pointer;font-size:.78rem;opacity:.6;transition:opacity .25s ease,background-color .25s ease,transform .15s ease,box-shadow .25s ease;font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-weight:500;line-height:1.2;box-shadow:0 2px 4px rgba(0,0,0,.2);outline:0;user-select:none}.code-wrapper:hover .copy-button,.copy-button:focus,.copy-button:hover{opacity:1;background-color:rgba(50,50,50,.95);transform:translateY(-1px);box-shadow:0 4px 8px rgba(0,0,0,.25)}.copy-button:active{transform:translateY(0);box-shadow:0 1px 3px rgba(0,0,0,.15)}@media (max-width:768px){.copy-button{font-size:.75rem;padding:5px 9px;top:.6em;right:.6em}.code-wrapper pre[class*=language-]{padding-right:55px}}.prompt-container{background-color:#edf2f7;border:1px solid #cbd5e0;border-radius:.45rem;padding:25px;margin-bottom:25px;box-shadow:0 3px 8px rgba(0,0,0,.04)}.prompt-container>h2:first-of-type{margin-top:1em}.prompt-container h2,.prompt-container h3,.prompt-container h4,.prompt-container h5{color:#2d3748;border-bottom-color:#cbd5e0}.prompt-container h3>.material-icons-outlined{color:#2d3748}.prompt-container h3{margin-top:1.8em}.prompt-container h3+ul{margin-bottom:1em}.prompt-container .content-box h4{margin-bottom:.8em}.prompt-container h2>.material-icons-outlined,.prompt-container h5>.material-icons-outlined{color:#4a5868}.prompt-container h2{font-size:1.9rem}.prompt-container h3{font-size:1.55rem;margin-top:2.2em}.prompt-container h4{font-size:1.25rem;margin-top:1.8em}.prompt-container li,.prompt-container p{color:#34495e;font-size:1.05rem}.prompt-container .mandatory-requirement{font-weight:700;color:#721c24;padding:12px 18px;border:2px solid #dc3545;background-color:#fddfe2;border-radius:.45rem;display:flex;align-items:center;margin:1.2em 0}.prompt-container .mandatory-requirement .material-icons-outlined{color:#dc3545;font-size:1.6em;margin-right:.6em;flex-shrink:0}.prompt-container .mandatory-requirement .instruction-chinese{font-weight:700;color:#c0392b;display:block;margin-top:8px}.prompt-container .mandatory-requirement code{background-color:#fbecee;border-color:#f8d7da;color:#a92330}.prompt-container ul{list-style-type:none;padding-left:0;margin-bottom:0}.prompt-container ul li{margin-bottom:.8em;padding-left:1.5em;position:relative}.prompt-container ul li:last-child{margin-bottom:0}.prompt-container ul li .material-icons-outlined{position:absolute;left:0;top:4px;font-size:1.25em;color:#0277bd;margin-right:.5em}.prompt-container ul li:has(.material-icons-outlined){padding-left:2em}.prompt-container .manual-list-item{margin-bottom:.8em;padding-left:2em;position:relative;color:#34495e;font-size:1.05rem;line-height:1.6}.prompt-container .manual-list-item:last-child{margin-bottom:0}.prompt-container .manual-list-item .material-icons-outlined{position:absolute;left:0;top:4px;font-size:1.25em;margin-right:.5em;color:#0277bd}.prompt-container .config-color-note .material-icons-outlined{top:6px;color:#ff8f00;font-size:1.25em;vertical-align:text-bottom}.content-box .config-color-note ol,.two-col-grid-container ol{margin-top:.6em;margin-bottom:0;color:#34495e;font-size:1rem}.content-box .config-color-note ol li,.two-col-grid-container ol li{font-size:inherit;padding-left:0;margin-bottom:.5em;line-height:1.7}.content-box .config-color-note ol li:last-child,.two-col-grid-container ol li:last-child{margin-bottom:0}#graph-container{width:100%;max-width:900px;margin:25px auto;padding-top:70px;box-sizing:border-box;background-color:#fff;border:1px solid #dde2e9;border-radius:.45rem;box-shadow:0 .4rem 1.2rem rgba(0,0,0,.06);position:relative;overflow:hidden}.prompt-container #graph-container{margin:20px auto 30px;background-color:#fff}#graph-output{display:flex;justify-content:center;align-items:center;min-height:350px;padding:30px;background-color:#fff}#graph-output svg{display:block;width:100%;max-width:100%;height:auto}#graph-controls-container{position:absolute;top:20px;right:20px;display:flex;gap:14px;z-index:10}.graph-button{padding:9px 15px;background-color:rgba(50,50,50,.8);color:#f0f4f8;border:none;border-radius:.35rem;cursor:pointer;font-size:.88rem;opacity:.9;transition:opacity .2s ease,background-color .2s ease,transform .15s ease,box-shadow .15s ease;font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-weight:500;line-height:1.2;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 2px 5px rgba(0,0,0,.12)}.graph-button:hover{opacity:1;background-color:rgba(30,30,30,.9);transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,0,0,.18)}.graph-button:active{transform:translateY(0);box-shadow:0 1px 3px rgba(0,0,0,.1)}.graph-button:disabled{opacity:.65;cursor:not-allowed;background-color:rgba(50,50,50,.8);transform:translateY(0);box-shadow:0 1px 3px rgba(0,0,0,.08)}.graph-button .svg-icon{width:1.25em;height:1.25em;fill:currentColor}.graph-button .material-icons-outlined{font-size:1.4em;margin-right:0}#layout-toggle-button{min-width:48px;font-weight:500;font-size:1rem}#layout-toggle-button.loading .material-icons-outlined{font-size:1.4em}@keyframes spin{to{transform:rotate(1turn)}}.icon-spin{animation:spin 1.5s linear infinite;display:inline-block}#zoom-modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(25,28,32,.95);z-index:1000;justify-content:center;align-items:center;overflow:hidden;backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}#zoom-content{position:relative;width:97%;height:97%;background-color:#fff;overflow:hidden;display:flex;justify-content:center;align-items:center;border-radius:calc(.45rem* 2);box-shadow:0 25px 60px rgba(0,0,0,.35)}#zoom-content svg{max-width:none;max-height:none;width:100%;height:100%;cursor:grab;display:block}#zoom-content svg:active{cursor:grabbing}#close-zoom{position:absolute;top:12px;right:12px;background:rgba(50,50,50,.85);color:#fff;border:none;border-radius:50%;width:48px;height:48px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:1001;transition:background-color .25s ease;box-shadow:0 3px 12px rgba(0,0,0,.3)}#close-zoom:focus-visible,#close-zoom:hover{background:rgba(20,20,20,.95);outline:0}#close-zoom .material-icons-outlined{font-size:30px;margin-right:0}.two-col-grid-container .col p:last-of-type{margin-bottom:0}.section-divider{border:0;height:1px;background-color:#e2e8f0;margin:2.5em 0}.two-col-grid-container{display:grid;grid-template-columns:1fr;gap:25px;margin-bottom:1.5em;align-items:stretch}.two-col-grid-container .col>:first-child{margin-top:0}.two-col-grid-container .col>:last-child{margin-bottom:0}.two-col-grid-container h4{margin-top:.8em}.two-col-grid-container .col p{margin-bottom:.8em}.content-box{margin-top:1.5em;margin-bottom:1.5em}.content-box>:first-child{margin-top:0}.content-box>:last-child{margin-bottom:0}@media (min-width:769px){.two-col-grid-container{grid-template-columns:repeat(2,1fr);gap:30px}.content-box{background-color:#fff;border:1px solid #e2e8f0;border-radius:.45rem;padding:20px 22px;box-shadow:0 2px 5px rgba(0,0,0,.04);box-sizing:border-box}.two-col-grid-container .col{background-color:#fff;border:1px solid #e2e8f0;border-radius:.45rem;padding:20px 22px;box-shadow:0 2px 5px rgba(0,0,0,.04);box-sizing:border-box}}@media (max-width:768px){.content-box{margin-top:0}.content-box>h4:first-child{margin-top:1.8em}.content-box>.manual-list-item:last-child{margin-bottom:.8em}}@media (max-width:768px){body{padding:10px;font-size:.96rem}.container{padding:15px;margin:10px auto}h1{font-size:2rem;margin-bottom:.7em}h2{font-size:1.6rem}h3{font-size:1.35rem}h4{font-size:1.15rem}h5{font-size:1rem}.prompt-container>h2:first-of-type{margin-top:.8em}.prompt-container h2{font-size:1.5rem}.prompt-container h3{font-size:1.25rem;margin-top:2em}.prompt-container h4{font-size:1.1rem;margin-top:1.6em}.prompt-container h5{font-size:1rem;margin-top:1.5em}pre[class*=language-],.code-wrapper{font-size:.88rem;padding:1.2em}.math-formula{font-size:1.15em;padding:8px}#graph-container{padding-top:60px}.prompt-container #graph-container{margin:20px auto}#graph-output{min-height:280px}#graph-controls-container{top:12px;right:12px;gap:8px}.graph-button{font-size:.8rem;padding:7px 10px}.graph-button .material-icons-outlined,.graph-button .svg-icon{font-size:1.25em}#layout-toggle-button{min-width:40px;font-size:.9rem}#layout-toggle-button.loading .material-icons-outlined{font-size:1.25em}#close-zoom{width:40px;height:40px}#close-zoom .material-icons-outlined{font-size:24px}.section-divider{margin:2em 0}.two-col-grid-container{margin-bottom:1em}.content-box{margin-bottom:1em}.two-col-grid-container .col>:last-child{margin-bottom:1.4em}.two-col-grid-container .col:last-child>:last-child{margin-bottom:0}.two-col-grid-container .col .math-formula{margin-bottom:1.4em}.two-col-grid-container .col p:last-of-type{margin-bottom:1.4em}.two-col-grid-container .col:last-child p:last-of-type{margin-bottom:0}}@media (max-width:480px){body{padding:5px}.container{padding:10px;margin:5px auto}h1{font-size:1.7rem;margin-bottom:.6em}h2{font-size:1.4rem}h3{font-size:1.2rem}h4{font-size:1.05rem}h5{font-size:.95rem}.prompt-container{padding:15px}.prompt-container>h2:first-of-type{margin-top:.6em}.prompt-container h2{font-size:1.3rem}.prompt-container h3{font-size:1.1rem;margin-top:1.8em}.prompt-container h4{font-size:1rem;margin-top:1.5em}.prompt-container h5{font-size:.9rem}.prompt-container .manual-list-item,.prompt-container li,.prompt-container p,.two-col-grid-container ol,.content-box .config-color-note ol{font-size:.9rem}.prompt-container .mandatory-requirement{padding:8px 12px;font-size:.85rem}.prompt-container .mandatory-requirement .material-icons-outlined{font-size:1.2em}.prompt-container .manual-list-item,.prompt-container ul li{padding-left:1.2em}.prompt-container .manual-list-item,.prompt-container ul li:has(.material-icons-outlined){padding-left:1.8em}#graph-controls-container{flex-direction:column;align-items:flex-end;gap:8px}#graph-container{padding-top:140px}.graph-button{width:auto;min-width:130px;justify-content:flex-start}.section-divider{margin:1.8em 0}.two-col-grid-container{gap:20px}}
</style>
</head>
<body>
<div class="container">
<h1><span class="material-icons-outlined">draw</span> <span class="text-primary">Canvas 助手</span> <span class="text-secondary">说明与示例</span></h1>
<div class="prompt-container">
<p class="mandatory-requirement" style="margin-top:1em">
<span class="material-icons-outlined">error_outline</span>
<span>绝对强制性要求：您提供的每个响应都必须是结构完整且语法有效的 HTML 文档。这意味着以 <code>&lt;!DOCTYPE html&gt;</code> 开头并以 <code>&lt;/html&gt;</code> 结尾，<strong>所有输出内容都要完整地包含在此 HTML 结构中</strong>。HTML 代码必须放在 Markdown 代码块中，使用 “<code>\`\`\`</code>” 符号。请勿添加注释。此段要求不要显示到最终的页面上。
</span>
</p>
<p>在遵守上述<strong class="text-danger">绝对强制性要求</strong>的同时，所有响应还必须遵循以下原则。<strong class="text-accent1"></strong></p>
<h3><span class="material-icons-outlined">checklist_rtl</span>1. 输出原则</h3>
<div class="two-col-grid-container">
<div class="col">
<ul>
<li><span class="material-icons-outlined">track_changes</span><strong>目标：</strong>生成功能齐全、视觉效果优秀且交互流畅的 HTML。优先考虑<strong class="strong-emphasis">美观性和可用性</strong>。</li>
<li><span class="material-icons-outlined">style</span><strong>CSS：</strong><strong class="strong-emphasis">必须</strong>嵌入在 <code>&lt;style&gt;</code> 标签内。力求样式简洁、现代且美观。</li>
<li><span class="material-icons-outlined">devices_other</span><strong>响应式：</strong>布局和内容<strong class="strong-emphasis">必须</strong>适应不同的屏幕尺寸。</li>
</ul>
</div>
<div class="col">
<ul>
<li><span class="material-icons-outlined">dynamic_feed</span>利用 HTML 的灵活特性并发挥其优势。</li>
<li><span class="material-icons-outlined">palette</span><strong class="strong-emphasis">必须</strong>使用不同的颜色来突出或强调文本。</li>
<li><span class="material-icons-outlined">emoji_objects</span><strong>图标使用：</strong>图标应增强理解、引导注意力并改善视觉效果、而非无处不在。</li>
</ul>
</div>
</div>
<hr class="section-divider">
<h3><span class="material-icons-outlined">functions</span>2. 数学（可选）</h3>
<ul>
    <li><span class="material-icons-outlined">layers</span><strong>渲染引擎：</strong><strong class="strong-emphasis">必须</strong>使用 MathJax (CHTML) 在 HTML 页面内渲染。</li>
    <li>
        <span class="material-icons-outlined" style="color: #dc3545;">rule_folder</span>
        <strong class="text-danger">强制性定界符规则:</strong> 所有数学公式 <strong class="text-danger">必须</strong> 使用指定的定界符包裹，<strong class="text-danger">不可省略</strong>。
        <ul style="padding-left: 20px; margin-top: 0.8em; list-style-type: disc;">
            <li style="padding-left: 5px; margin-bottom: 0.3em; position: static;">行内公式: <strong class="strong-emphasis">必须</strong>使用 <code>\\(...\\)</code>。</li>
            <li style="padding-left: 5px; position: static;">行间公式: <strong class="strong-emphasis">必须</strong>使用 <code>\\[...\\]</code>。</li>
        </ul>
    </li>
</ul>
<div class="two-col-grid-container">
<div class="col">
<p class="sub-topic-heading text-highlight-blue"><span class="material-icons-outlined">horizontal_rule</span>行内公式</p>
<p>嵌入文本中，使用 <code>\\( ... \\)</code> 作为分隔符，例如著名的质能方程 <strong class="text-primary">\\( \\color{#007bff}{E} = \\color{#28a745}{m}\\color{#dc3545}{c}^2 \\)</strong>。</p>
</div>
<div class="col">
<p class="sub-topic-heading text-highlight-purple"><span class="material-icons-outlined">subject</span>块级公式</p>
<p>块级公式单独成行并居中显示，使用 <code>\\[ ... \\]</code> 作为分隔符。例如经典的欧拉恒等式：</p>
<div class="math-formula">\\[ \\color{#AE3EC9}{e}^{\\color{#ff8f00}{i\\pi}} \\color{#AE3EC9}{+} \\color{#17a2b8}{1} = \\color{#374151}{0} \\]</div>
</div>
</div>
<hr class="section-divider">
<h3><span class="material-icons-outlined">code</span>3. 代码（可选）</h3>
<ul>
<li><span class="material-icons-outlined" style="color:#28a745">colorize</span><strong class="text-accent2">代码高亮：</strong>如果包含代码块，将使用 <strong class="strong-emphasis">Prism.js</strong> 进行语法高亮。</li>
<li><span class="material-icons-outlined" style="color:#28a745">content_copy</span><strong class="text-accent2">复制功能提示：</strong>页面中出现的任何代码块，其右上角将自动提供“复制”按钮，点击即可复制代码到剪贴板，并显示操作成功提示（“已复制!”）。</li>
</ul>
 <p style="margin-top: 1.8em; margin-bottom: 0.8em;">下面是一个 JavaScript 代码块示例，右上角会自动显示一个 <strong class="strong-emphasis">“复制”</strong> 按钮：</p>
<pre><code class="language-javascript">function greet(name) {
  // 返回一个问候字符串
  return \`你好, \${name}! 欢迎使用 Canvas 助手。\`;
}

// 调用函数并打印到控制台
console.log(greet('开发者'));</code></pre>
<hr class="section-divider">
<h3><span class="material-icons-outlined">visibility</span>4. 图形可视化（可选）</h3>
<div class="two-col-grid-container">
<div class="col">
<h4><span class="material-icons-outlined">bar_chart</span>ECharts</h4>
<p>使用 <strong class="strong-emphasis">ECharts</strong> 提供交互式图表。库依赖项（推荐）应按需选择：</p>
<p>ECharts 核心库 (2D 图表): <code>https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js</code></p>
<p>ECharts-GL (3D 图表, 依赖核心库): <code>https://cdn.jsdelivr.net/npm/echarts-gl@2.0.9/dist/echarts-gl.min.js</code></p>
</div>
<div class="col">
<h4><span class="material-icons-outlined" style="color:#673AB7">gesture</span> <span style="color:#673AB7">SVG (可缩放矢量图形)</span></h4>
<p>您可以直接在 HTML 中嵌入 <strong class="strong-emphasis">SVG (Scalable Vector Graphics)</strong> 代码来渲染矢量图形。这对于创建图标、简单的图示、或当您需要通过代码精确控制图形细节时非常有用。SVG 图形是基于 XML 的，可以在不损失质量的情况下缩放。</p>
</div>
</div>
<div class="content-box">
<h4><span class="material-icons-outlined">hub</span>Graphviz</h4>
<div class="manual-list-item">
<span class="material-icons-outlined">biotech</span>
<strong>技术：</strong>在 HTML 页面内使用 DOT 语言描述，结合 Viz.js (用于前端 SVG 渲染) 和 Panzoom.js (用于交互式缩放/平移)。
</div>
<div class="manual-list-item config-color-note">
<span class="material-icons-outlined">color_lens</span>
<strong>配置与颜色 (<span class="text-warning">重要</span>):</strong>
<ol style="padding-left:20px;list-style-type:decimal">
<li><strong>节点填充：</strong>通常设置 <code>style=filled</code>, <code>fillcolor</code>。</li>
<li><strong>无 CSS 变量：</strong>在 DOT 字符串中定义颜色时（例如 <code>fillcolor</code>, <code>color</code>），<strong class="text-danger">严格禁止</strong>使用 CSS 变量 (<code>var(...)</code>)。<strong class="strong-emphasis">必须</strong>使用直接的颜色值（例如 <code>#E8F5E9</code>, <code>lightgrey</code>, <code>"blue"</code>）。</li>
<li><strong>颜色对比：</strong>节点 <code>fillcolor</code> 和文本<strong class="strong-emphasis">必须</strong>具有高对比度。</li>
</ol>
</div>
</div>
<h5><span class="material-icons-outlined" style="color:#ffc107">schema</span><span class="text-accent3">Graphviz 示例：简单流程图</span></h5>
<p>这是一个使用 Graphviz 描绘的简单流程图。<strong>请严格参考此示例的实现。</strong></p>
<div id="graph-container">
<div id="graph-controls-container">
<button id="zoom-button" class="graph-button" title="全屏查看与交互"><svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg> <span>全屏</span></button>
<button id="layout-toggle-button" class="graph-button" title="切换布局方向"></button>
<button id="download-button" class="graph-button" title="下载 PNG 图片"><svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zm14-9h-4V3H9v8H5l7 7 7-7z"/></svg> <span>下载</span></button>
</div>
<div id="graph-output"></div>
</div>
<div id="zoom-modal" role="dialog" aria-modal="true" aria-labelledby="zoom-modal-title">
<div id="zoom-content"></div>
<button id="close-zoom" title="关闭全屏" aria-label="关闭全屏"><span class="material-icons-outlined">close</span></button>
<h2 id="zoom-modal-title" style="display:none">图表全屏交互视图</h2>
</div>
</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js" defer></script>

<script>
document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('pre > code[class*="language-"]').forEach(e=>{
        const t=e.parentNode;
        if(t.parentNode.classList.contains('code-wrapper'))return;
        const o=document.createElement('div');
        o.className='code-wrapper',t.parentNode.insertBefore(o,t),o.appendChild(t);
        const n=document.createElement('button');
        n.className='copy-button',n.textContent='复制',n.title='复制代码到剪贴板',o.appendChild(n);
        let a=null;
        const i=n.textContent,r=n.style.backgroundColor;
        n.addEventListener('click',()=>{
            a&&clearTimeout(a),
            navigator.clipboard.writeText(e.textContent).then(()=>{
                n.textContent='已复制!',
                n.style.backgroundColor='#28a745',
                a=setTimeout(()=>{n.textContent=i,n.style.backgroundColor=r,a=null},1800)
            })
         })
     });

    const e=document.getElementById('graph-output'),
          t=document.getElementById('zoom-button'),
          o=document.getElementById('layout-toggle-button'),
          n=document.getElementById('download-button'),
          a=document.getElementById('zoom-modal'),
          i=document.getElementById('zoom-content'),
          r=document.getElementById('close-zoom');
    let l=null,s=null,c='LR';
   
    const u=setInterval(()=>{
        if("undefined"!=typeof Viz&&void 0!==Viz.prototype.renderSVGElement){
             clearInterval(u);
            (s=new Viz({worker:void 0}))&&(p(),m(c));
         }
        },100);

    const S = \`
        digraph SimpleGraph {
         graph [labelloc=t, label="简单流程图示例", fontsize=18, fontname="Inter, sans-serif", bgcolor="transparent", pad="0.5", splines=ortho];
         node [fontname="Inter, sans-serif", fontsize=11, style="filled,rounded", color="#666", shape=box, margin="0.2,0.1"];
         edge [fontsize=9, fontname="Inter, sans-serif", color="#888", arrowsize=0.7];
         A [label="步骤 A", fillcolor="#E0E7FF"];
         B [label="步骤 B", fillcolor="#D1FAE5"];
         C [label="步骤 C", fillcolor="#FEF3C7"];
         A -> B [label="过程 1"];
         B -> C [label="过程 2"];
        }\`;
    
    const g=e=>{l&&l.zoomWithWheel&&(e.preventDefault(),l.zoomWithWheel(e))};
    
    function p(){
        if(!o||!s)return;
        const e='TB'===c?'LR':'TB';
        o.textContent=e,o.title=\`切换到 \${e} 布局\`,o.disabled=!1;
     }

    async function m(d){
        if(!s || !e || !i) return;
         const rButtons = [o,t,n];
         rButtons.forEach(btn => { if(btn) btn.disabled = true; });
         if (e) e.innerHTML = ""; 

        let u=S.replace(/rankdir\\s*=\\s*"\\w+"\\s*,?/gi,'');
        const h=u.match(/(\\s*graph\\s*\\[)([^\\)]*?)(\\s*\\])/);
        if(h){
            let e=h[2].trim();
            e.length>0&&!e.endsWith(',')&&(e+=','),u=u.replace(/(\\s*graph\\s*\\[)[^\\)]*?(\\s*\\])/,\`$1 \${e} rankdir="\${d}" $2\`)
        }
       
        const svgElement = await s.renderSVGElement(u);
        e.appendChild(svgElement);
        i.innerHTML = "";
        i.appendChild(svgElement.cloneNode(true));
        const zoomSvg = i.querySelector('svg');
         if(zoomSvg && "undefined" != typeof Panzoom) {
            if(l && l.destroy) {
                 i.removeEventListener('wheel', g);
                 l.destroy();
             }
            l = Panzoom(zoomSvg, { maxZoom: 15, minZoom: .05, contain: "outside", canvas: true });
            i.addEventListener('wheel', g, { passive: false });
         }
        c = d;
        
         p();
         rButtons.forEach(btn => { if(btn) btn.disabled = false; });
       }

     e&&o&&t&&n&&a&&i&&r&&(o.addEventListener('click',()=>m('TB'===c?'LR':'TB')),t.addEventListener('click',()=>{l&&(a.style.display="flex",document.body.style.overflow="hidden",l.reset({animate:!0}),r.focus())}));
     const h=()=>{a.style.display="none",document.body.style.overflow=""};
     r&&r.addEventListener('click',h),document.addEventListener('keydown',e=>{"Escape"===e.key&&h()});
     
     setTimeout(()=>{void 0!==window.Prism&&Prism.highlightAll&&Prism.highlightAll()},300)
});
</script>
</body>
</html>`;