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
  textCode: '#16a34a',       
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