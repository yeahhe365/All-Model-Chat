
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

export const ONYX_THEME_COLORS: ThemeColors = {
  // Backgrounds
  bgPrimary: '#09090b', // Zinc 950
  bgSecondary: '#18181b', // Zinc 900
  bgTertiary: '#27272a', // Zinc 800
  bgAccent: '#2563eb', // Blue 600
  bgAccentHover: '#3b82f6', // Blue 500
  bgDanger: '#ef4444',
  bgDangerHover: '#dc2626',
  bgInput: '#27272a', // Zinc 800
  bgCodeBlock: '#18181b', // Zinc 900 (inset effect)
  bgCodeBlockHeader: '#27272a', // Zinc 800
  bgUserMessage: '#2563eb', // Blue 600
  bgModelMessage: 'transparent',
  bgErrorMessage: 'rgba(127, 29, 29, 0.2)',
  bgSuccess: 'rgba(20, 83, 45, 0.2)',
  textSuccess: '#4ade80',
  bgInfo: 'rgba(30, 58, 138, 0.2)',
  textInfo: '#60a5fa',
  bgWarning: 'rgba(120, 53, 15, 0.2)',
  textWarning: '#fbbf24',

  // Text
  textPrimary: '#fafafa', // Zinc 50
  textSecondary: '#a1a1aa', // Zinc 400
  textTertiary: '#71717a', // Zinc 500
  textAccent: '#ffffff',
  textDanger: '#ffffff',
  textLink: '#38bdf8', // Sky 400
  textCode: '#e4e4e7', // Zinc 200
  bgUserMessageText: '#ffffff',
  bgModelMessageText: '#e4e4e7', // Zinc 200
  bgErrorMessageText: '#fca5a5',

  // Borders
  borderPrimary: '#27272a', // Zinc 800
  borderSecondary: '#3f3f46', // Zinc 700
  borderFocus: '#3b82f6', // Blue 500

  // Scrollbar
  scrollbarThumb: '#3f3f46', // Zinc 700
  scrollbarTrack: 'transparent',

  // Icons
  iconUser: '#ffffff',
  iconModel: '#3b82f6', // Brand Blue
  iconError: '#ef4444',
  iconThought: '#71717a',
  iconSettings: '#a1a1aa',
  iconClearChat: '#fafafa',
  iconSend: '#ffffff',
  iconAttach: '#a1a1aa',
  iconStop: '#ffffff',
  iconEdit: '#a1a1aa',
  iconHistory: '#a1a1aa',
};

export const PEARL_THEME_COLORS: ThemeColors = {
  // Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#f9f9f9',
  bgTertiary: '#ECECF1',
  bgAccent: '#40414F',
  bgAccentHover: '#202123',
  bgDanger: '#DF3434',
  bgDangerHover: '#B32929',
  bgInput: '#FFFFFF',
  bgCodeBlock: '#F7F7F8',
  bgCodeBlockHeader: 'rgba(236, 236, 241, 0.9)',
  bgUserMessage: '#f3f4f6', // Updated: Light Gray
  bgModelMessage: '#FFFFFF', // Updated: White
  bgErrorMessage: '#FEE',
  bgSuccess: 'rgba(22, 163, 74, 0.1)',
  textSuccess: '#16a34a',
  bgInfo: 'rgba(64, 65, 79, 0.05)',
  textInfo: '#40414F',
  bgWarning: 'rgba(212, 167, 44, 0.1)',
  textWarning: '#825F0A',

  // Text
  textPrimary: '#202123',
  textSecondary: '#565869',
  textTertiary: '#8E8E8E',
  textAccent: '#FFFFFF',
  textDanger: '#FFFFFF',
  textLink: '#565869',
  textCode: '#40414f',
  bgUserMessageText: '#1f2937', // Updated: Dark Gray
  bgModelMessageText: '#1f2937', // Updated: Dark Gray
  bgErrorMessageText: '#DF3434',

  // Borders
  borderPrimary: '#E5E5E5',
  borderSecondary: '#D9D9E3',
  borderFocus: '#40414F',

  // Scrollbar
  scrollbarThumb: '#D9D9E3',
  scrollbarTrack: '#F7F7F8',

  // Icons
  iconUser: '#202123',
  iconModel: '#10a37f',
  iconError: '#DF3434',
  iconThought: '#323232',
  iconSettings: '#323232',
  iconClearChat: '#FFFFFF',
  iconSend: '#FFFFFF',
  iconAttach: '#323232',
  iconStop: '#FFFFFF',
  iconEdit: '#323232',
  iconHistory: '#323232',
};

export const AVAILABLE_THEMES: Theme[] = [
  { id: 'onyx', name: 'Onyx (Dark)', colors: ONYX_THEME_COLORS },
  { id: 'pearl', name: 'Pearl (Light)', colors: PEARL_THEME_COLORS },
];

export const DEFAULT_THEME_ID = 'pearl';
