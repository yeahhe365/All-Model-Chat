import { appTranslations } from './translations/app';
import { headerTranslations } from './translations/header';
import { chatInputTranslations } from './translations/chatInput';
import { messagesTranslations } from './translations/messages';
import { scenariosTranslations } from './translations/scenarios';
import { historyTranslations } from './translations/history';
import { commonTranslations } from './translations/common';

// 直接导入 settings 下的细分翻译，消除原先的中间层 (settings.ts)
import { generalSettings } from './translations/settings/general';
import { appearanceSettings } from './translations/settings/appearance';
import { apiSettings } from './translations/settings/api';
import { modelSettings } from './translations/settings/model';
import { dataSettings } from './translations/settings/data';
import { safetySettings } from './translations/settings/safety';
import { shortcutsSettings } from './translations/settings/shortcuts';
import { aboutSettings } from './translations/settings/about';

export const translations = {
    ...appTranslations,
    ...headerTranslations,
    ...chatInputTranslations,
    ...messagesTranslations,
    ...scenariosTranslations,
    ...historyTranslations,
    ...commonTranslations,
    
    // 直接在此处展开 Settings 的翻译
    ...generalSettings,
    ...appearanceSettings,
    ...apiSettings,
    ...modelSettings,
    ...dataSettings,
    ...safetySettings,
    ...shortcutsSettings,
    ...aboutSettings,
};

export const getTranslator = (lang: 'en' | 'zh') => (key: keyof typeof translations, fallback?: string): string => {
    // The type assertion is safe because we've merged all the objects.
    const translationSet = translations as any;
    return translationSet[key]?.[lang] ?? fallback ?? translationSet[key]?.['en'] ?? key;
};
