import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../../../../contexts/I18nContext';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../../constants/appConstants';

interface WebSearchToggleProps {
    isGoogleSearchEnabled: boolean;
    onToggleGoogleSearch: () => void;
    disabled: boolean;
}

export const WebSearchToggle: React.FC<WebSearchToggleProps> = ({
    isGoogleSearchEnabled,
    onToggleGoogleSearch,
    disabled
}) => (
    <WebSearchToggleInner
        isGoogleSearchEnabled={isGoogleSearchEnabled}
        onToggleGoogleSearch={onToggleGoogleSearch}
        disabled={disabled}
    />
);

const WebSearchToggleInner: React.FC<WebSearchToggleProps> = ({
    isGoogleSearchEnabled,
    onToggleGoogleSearch,
    disabled,
}) => {
    const { t } = useI18n();

    return (
        <button
            type="button"
            onClick={onToggleGoogleSearch}
            disabled={disabled}
            className={`${CHAT_INPUT_BUTTON_CLASS} ${isGoogleSearchEnabled ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' : 'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]'}`}
            aria-label={t('web_search_label')}
            title={t('web_search_label')}
        >
            <Globe size={20} strokeWidth={2} />
        </button>
    );
};
