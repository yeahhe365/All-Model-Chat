import React from 'react';
import { X, Save, Edit2, Loader2, ArrowUp } from 'lucide-react';
import { IconStop } from '../../../icons/CustomIcons';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../../constants/appConstants';

interface SendControlsProps {
    isLoading: boolean;
    isEditing: boolean;
    canSend: boolean;
    isWaitingForUpload: boolean;
    editMode?: 'update' | 'resend';
    onStopGenerating: () => void;
    onCancelEdit: () => void;
    onFastSendMessage?: () => void;
    t: (key: string, fallback?: string) => string;
}

export const SendControls: React.FC<SendControlsProps> = ({
    isLoading,
    isEditing,
    canSend,
    isWaitingForUpload,
    editMode,
    onStopGenerating,
    onCancelEdit,
    onFastSendMessage,
    t
}) => {
    const iconSize = 20;

    if (isLoading) {
        return (
            <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStopGenerating(); }} 
                className={`${CHAT_INPUT_BUTTON_CLASS} bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)]`} 
                aria-label={t('stopGenerating_aria')} 
                title={t('stopGenerating_title')}
            >
                <IconStop size={12} />
            </button>
        );
    }

    if (isEditing) {
        return (
            <>
                <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancelEdit(); }} 
                    className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-settings)]`} 
                    aria-label={t('cancelEdit_aria')} 
                    title={t('cancelEdit_title')}
                >
                    <X size={iconSize} strokeWidth={2} />
                </button>
                <button type="submit" disabled={!canSend} className={`${CHAT_INPUT_BUTTON_CLASS} bg-amber-500 hover:bg-amber-600 text-white disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} aria-label={t('updateMessage_aria')} title={t('updateMessage_title')}>
                    {editMode === 'update' ? <Save size={iconSize} strokeWidth={2} /> : <Edit2 size={iconSize} strokeWidth={2} />}
                </button>
            </>
        );
    }

    return (
        <button 
            type="submit" 
            disabled={!canSend || isWaitingForUpload} 
            className={`${CHAT_INPUT_BUTTON_CLASS} bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} 
            aria-label={isWaitingForUpload ? "Waiting for upload..." : t('sendMessage_aria')} 
            title={isWaitingForUpload ? "Waiting for upload to complete before sending" : (t('sendMessage_title') + (onFastSendMessage ? t('sendMessage_fast_suffix', " (Right-click for Fast Mode ⚡)") : ""))}
            onContextMenu={(e) => {
                if (onFastSendMessage && !isWaitingForUpload && canSend) {
                    e.preventDefault();
                    onFastSendMessage();
                }
            }}
        >
            {isWaitingForUpload ? (
                <Loader2 size={iconSize} className="animate-spin" strokeWidth={2} />
            ) : (
                <ArrowUp size={iconSize} strokeWidth={2} />
            )}
        </button>
    );
};