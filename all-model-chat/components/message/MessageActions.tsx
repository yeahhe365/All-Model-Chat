import React from 'react';
import { User, Bot, AlertTriangle, Edit3, Trash2, RotateCw, Volume2, Loader2 } from 'lucide-react';
import { ChatMessage, ThemeColors } from '../../types';
import { translations, getResponsiveValue } from '../../utils/appUtils';
import { ExportMessageButton } from './buttons/ExportMessageButton';
import { MessageCopyButton } from './buttons/MessageCopyButton';

const UserIcon: React.FC = () => <User size={getResponsiveValue(24, 29)} className="text-[var(--theme-icon-user)] flex-shrink-0" />;
const BotIcon: React.FC = () => <Bot size={getResponsiveValue(24, 29)} className="text-[var(--theme-icon-model)] flex-shrink-0" />;
const ErrorMsgIcon: React.FC = () => <AlertTriangle size={getResponsiveValue(24, 29)} className="text-[var(--theme-icon-error)] flex-shrink-0" />;

interface MessageActionsProps {
    message: ChatMessage;
    isGrouped: boolean;
    onEditMessage: (messageId: string) => void;
    onDeleteMessage: (messageId: string) => void;
    onRetryMessage: (messageId: string) => void;
    onTextToSpeech: (messageId: string, text: string) => void;
    ttsMessageId: string | null;
    themeColors: ThemeColors;
    themeId: string;
    t: (key: keyof typeof translations) => string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
    message,
    isGrouped,
    onEditMessage,
    onDeleteMessage,
    onRetryMessage,
    onTextToSpeech,
    ttsMessageId,
    themeColors,
    themeId,
    t
}) => {
    const actionIconSize = getResponsiveValue(17, 19);
    const showRetryButton = (message.role === 'model' || (message.role === 'error' && message.generationStartTime));
    const isThisMessageLoadingTts = ttsMessageId === message.id;
    const actionButtonClasses = "p-1.5 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] focus:ring-[var(--theme-border-focus)]";

    return (
        <div className="flex-shrink-0 w-8 sm:w-10 flex flex-col items-center sticky top-2 sm:top-4 self-start z-10">
            <div className="h-7 sm:h-8">
                {!isGrouped && (
                    <>
                        {message.role === 'user' && <UserIcon />}
                        {message.role === 'model' && <BotIcon />}
                        {message.role === 'error' && <ErrorMsgIcon />}
                    </>
                )}
            </div>
            <div
                className="message-actions flex flex-col items-center gap-0.5 mt-1 sm:mt-1.5"
                style={{ '--actions-translate-x': message.role === 'user' ? '8px' : '-8px' } as React.CSSProperties}
            >
                {message.role === 'user' && !message.isLoading && <button onClick={() => onEditMessage(message.id)} title={t('edit')} aria-label={t('edit')} className={`${actionButtonClasses} text-[var(--theme-icon-edit)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`}><Edit3 size={actionIconSize} /></button>}
                {showRetryButton && !message.isLoading && <button onClick={() => onRetryMessage(message.id)} title={t('retry_button_title')} aria-label={t('retry_button_title')} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`}><RotateCw size={actionIconSize} /></button>}
                {(message.content || message.thoughts) && !message.isLoading && <MessageCopyButton textToCopy={message.content} t={t} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`} iconSize={actionIconSize} />}
                {message.content && !message.isLoading && message.role === 'model' && !message.audioSrc && (
                    <>
                        <button onClick={() => onTextToSpeech(message.id, message.content)} disabled={!!ttsMessageId} title="Read aloud" aria-label="Read message aloud" className={`${actionButtonClasses} text-[var(--theme-icon-edit)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed`}>
                            {isThisMessageLoadingTts ? <Loader2 size={actionIconSize} className="animate-spin" /> : <Volume2 size={actionIconSize} />}
                        </button>
                        <ExportMessageButton type="png" markdownContent={message.content} messageId={message.id} themeColors={themeColors} themeId={themeId} t={t} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`} iconSize={actionIconSize} />
                        <ExportMessageButton type="html" markdownContent={message.content} messageId={message.id} themeColors={themeColors} themeId={themeId} t={t} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`} iconSize={actionIconSize} />
                    </>
                )}
                {!message.isLoading && <button onClick={() => onDeleteMessage(message.id)} title={t('delete')} aria-label={t('delete')} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-tertiary)]`}><Trash2 size={actionIconSize} /></button>}
            </div>
        </div>
    );
};
