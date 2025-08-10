import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { translations } from '../../utils/appUtils';
import { AppSettings } from '../../types';
import { geminiServiceInstance } from '../../services/geminiService';
import { getKeyForRequest, logService } from '../../utils/appUtils';
import { MessageCopyButton } from '../message/buttons/MessageCopyButton';

type ActionType = 'explain' | 'summarize' | 'translate';

interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    action: ActionType;
    selectedText: string;
    appSettings: AppSettings;
    t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ActionModal: React.FC<ActionModalProps> = ({ isOpen, onClose, action, selectedText, appSettings, t }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [resultText, setResultText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const language = appSettings.language === 'system' 
        ? (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en') 
        : appSettings.language;

    const generateContent = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setResultText('');

        const keyResult = getKeyForRequest(appSettings, { ...appSettings, lockedApiKey: null });
        if ('error' in keyResult) {
            setError(keyResult.error);
            setIsLoading(false);
            return;
        }

        try {
            const modelToUse = appSettings.toolbarModelId ?? 'gemini-2.5-flash';
            const result = await geminiServiceInstance.generateTextForAction(keyResult.key, modelToUse, action, selectedText, language, appSettings.isToolbarActionsThinkingEnabled ?? false);
            setResultText(result);
        } catch (err) {
            logService.error('ActionModal generation failed', { err });
            setError(err instanceof Error ? err.message : String(t('action_modal_error')));
        } finally {
            setIsLoading(false);
        }
    }, [action, selectedText, appSettings, language, t]);

    useEffect(() => {
        if (isOpen) {
            generateContent();
        }
    }, [isOpen, generateContent]);
    
    const titles: Record<ActionType, keyof typeof translations> = {
        explain: 'action_modal_title_explain',
        summarize: 'action_modal_title_summarize',
        translate: 'action_modal_title_translate',
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="bg-[var(--theme-bg-primary)] rounded-lg shadow-lg w-full max-w-2xl flex flex-col max-h-[80vh]" role="dialog" aria-labelledby="action-modal-title" aria-modal="true">
                <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-[var(--theme-border-primary)]">
                    <h2 id="action-modal-title" className="text-lg font-semibold text-[var(--theme-text-primary)]">{t(titles[action])}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors" aria-label={t('close')}><X size={20} /></button>
                </header>

                <div className="flex-grow p-4 overflow-y-auto custom-scrollbar space-y-4">
                    <div>
                        <h3 className="text-sm font-medium text-[var(--theme-text-tertiary)] mb-2">{t('action_modal_original_text')}</h3>
                        <div className="bg-[var(--theme-bg-input)] p-3 rounded-md text-sm text-[var(--theme-text-secondary)] max-h-40 overflow-auto custom-scrollbar">
                           <p style={{ whiteSpace: 'pre-wrap' }}>{selectedText}</p>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-sm font-medium text-[var(--theme-text-tertiary)] mb-2">{t('action_modal_result')}</h3>
                        <div className="bg-[var(--theme-bg-secondary)] p-3 rounded-md text-sm text-[var(--theme-text-primary)] min-h-[100px] relative">
                            {isLoading && <div className="absolute inset-0 flex items-center justify-center text-[var(--theme-text-tertiary)]" aria-live="polite"><Loader2 size={24} className="animate-spin mr-2" /> {t('action_modal_generating')}</div>}
                            {error && <div className="text-red-400 flex items-center gap-2" role="alert"><AlertTriangle size={16} />{error}</div>}
                            {!isLoading && !error && <p style={{ whiteSpace: 'pre-wrap' }}>{resultText}</p>}
                        </div>
                    </div>
                </div>

                <footer className="flex-shrink-0 flex justify-end items-center p-3 border-t border-[var(--theme-border-primary)]">
                    {!isLoading && !error && resultText && (
                        <MessageCopyButton textToCopy={resultText} t={t} className="px-3 py-1.5 text-sm bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded-md transition-colors flex items-center gap-2" />
                    )}
                </footer>
            </div>
        </Modal>
    );
};