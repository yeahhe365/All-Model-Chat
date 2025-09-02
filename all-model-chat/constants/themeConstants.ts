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
  bgPrimary: '#1d1d20',
  bgSecondary: '#2b2b31',
  bgTertiary: '#40414F',
  bgAccent: '#10a37f',
  bgAccentHover: '#0e906d',
  bgDanger: '#DA3633',
  bgDangerHover: '#F85149',
  bgInput: '#40414F',
  bgCodeBlock: '#282c34',
  bgCodeBlockHeader: 'rgba(40, 44, 52, 0.7)',
  bgUserMessage: '#10a37f',
  bgModelMessage: '#2b2b31',
  bgErrorMessage: 'rgba(218, 54, 51, 0.2)',
  bgSuccess: 'rgba(74, 222, 128, 0.15)',
  textSuccess: '#4ade80',
  bgInfo: 'rgba(138, 138, 145, 0.15)',
  textInfo: '#C5C5D2',
  bgWarning: 'rgba(212, 167, 44, 0.15)',
  textWarning: '#D4A72C',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#E0E0E0',
  textTertiary: '#8A8A91',
  textAccent: '#FFFFFF',
  textDanger: '#FFFFFF',
  textLink: '#C5C5D2',
  textCode: '#C5C5D2',
  bgUserMessageText: '#FFFFFF',
  bgModelMessageText: '#FFFFFF',
  bgErrorMessageText: '#FFFFFF',

  // Borders
  borderPrimary: '#444654',
  borderSecondary: '#565869',
  borderFocus: '#8E8EA0',

  // Scrollbar
  scrollbarThumb: '#565869',
  scrollbarTrack: '#2b2b31',

  // Icons
  iconUser: '#E0E0E0',
  iconModel: '#10a37f',
  iconError: '#F85149',
  iconThought: '#8A8A91',
  iconSettings: '#E0E0E0',
  iconClearChat: '#FFFFFF',
  iconSend: '#FFFFFF',
  iconAttach: '#E0E0E0',
  iconStop: '#FFFFFF',
  iconEdit: '#E0E0E0',
  iconHistory: '#E0E0E0',
};

export const PEARL_THEME_COLORS: ThemeColors = {
  // Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F7F7F8',
  bgTertiary: '#ECECF1',
  bgAccent: '#40414F',
  bgAccentHover: '#202123',
  bgDanger: '#DF3434',
  bgDangerHover: '#B32929',
  bgInput: '#FFFFFF',
  bgCodeBlock: '#fafafa',
  bgCodeBlockHeader: 'rgba(236, 236, 241, 0.9)',
  bgUserMessage: '#FFFFFF',
  bgModelMessage: '#F7F7F8',
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
  bgUserMessageText: '#202123',
  bgModelMessageText: '#202123',
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
  iconThought: '#565869',
  iconSettings: '#565869',
  iconClearChat: '#FFFFFF',
  iconSend: '#FFFFFF',
  iconAttach: '#565869',
  iconStop: '#FFFFFF',
  iconEdit: '#565869',
  iconHistory: '#565869',
};

export const AVAILABLE_THEMES: Theme[] = [
  { id: 'onyx', name: 'Onyx (Dark)', colors: ONYX_THEME_COLORS },
  { id: 'pearl', name: 'Pearl (Light)', colors: PEARL_THEME_COLORS },
];

export const DEFAULT_THEME_ID = 'pearl';