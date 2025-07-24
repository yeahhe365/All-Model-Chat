// This file is the new entry point for translations, aggregating from modularized files.

import { appTranslations } from './translations/app';
import { headerTranslations } from './translations/header';
import { chatInputTranslations } from './translations/chatInput';
import { messagesTranslations } from './translations/messages';
import { settingsTranslations } from './translations/settings';
import { scenariosTranslations } from './translations/scenarios';
import { historyTranslations } from './translations/history';
import { commonTranslations } from './translations/common';

export const translations = {
    ...appTranslations,
    ...headerTranslations,
    ...chatInputTranslations,
    ...messagesTranslations,
    ...settingsTranslations,
    ...scenariosTranslations,
    ...historyTranslations,
    ...commonTranslations,
};

// The getTranslator function remains the same.
export const getTranslator = (lang: 'en' | 'zh') => (key: keyof typeof translations, fallback?: string): string => {
    // The type assertion is safe because we've merged all the objects.
    const translationSet = translations as any;
    return translationSet[key]?.[lang] ?? fallback ?? translationSet[key]?.['en'] ?? key;
};