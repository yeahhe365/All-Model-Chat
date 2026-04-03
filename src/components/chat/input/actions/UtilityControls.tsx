import React from 'react';
import { Maximize2, Minimize2, Languages, Loader2 } from 'lucide-react';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../../constants/appConstants';

interface UtilityControlsProps {
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
    isTranslating: boolean;
    onTranslate: () => void;
    disabled: boolean;
    canTranslate: boolean;
    t: (key: string) => string;
}

export const UtilityControls: React.FC<UtilityControlsProps> = ({
    isFullscreen,
    onToggleFullscreen,
    isTranslating,
    onTranslate,
    disabled,
    canTranslate,
    t
}) => {
    const iconSize = 20;

    return (
        <>
            {onToggleFullscreen && (
                <button
                    type="button"
                    onClick={onToggleFullscreen}
                    disabled={disabled}
                    className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]`}
                    aria-label={isFullscreen ? t('fullscreen_tooltip_collapse') : t('fullscreen_tooltip_expand')}
                    title={isFullscreen ? t('fullscreen_tooltip_collapse') : t('fullscreen_tooltip_expand')}
                >
                    {isFullscreen ? <Minimize2 size={iconSize} strokeWidth={2} /> : <Maximize2 size={iconSize} strokeWidth={2} />}
                </button>
            )}

            <button
                type="button"
                onClick={onTranslate}
                disabled={!canTranslate || isTranslating}
                className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]`}
                aria-label={isTranslating ? t('translating_button_title') : t('translate_button_title')}
                title={isTranslating ? t('translating_button_title') : t('translate_button_title')}
            >
                {isTranslating ? (
                    <Loader2 size={iconSize} className="animate-spin text-[var(--theme-text-link)]" strokeWidth={2} />
                ) : (
                    <Languages size={iconSize} strokeWidth={2} />
                )}
            </button>
        </>
    );
};