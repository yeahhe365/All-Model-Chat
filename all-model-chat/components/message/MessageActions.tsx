
import React from 'react';
import { User, Bot, AlertTriangle, Edit3, Trash2, RotateCw, Volume2, Loader2, Pencil, Wand2, CirclePlay } from 'lucide-react';
import { ChatMessage, ThemeColors } from '../../types';
import { translations } from '../../utils/appUtils';
import { ExportMessageButton } from './buttons/ExportMessageButton';
import { MessageCopyButton } from './buttons/MessageCopyButton';
import { useResponsiveValue } from '../../hooks/useDevice';

const AvatarWrapper: React.FC<{ children: React.ReactNode; onClick: () => void; showEditOverlay: boolean }> = ({ children, onClick, showEditOverlay }) => (
    <div className="relative group/avatar cursor-pointer" onClick={onClick}>
        {children}
        {showEditOverlay && (
            <div className="absolute inset-0 bg-black/60 dark:bg-black/50 rounded-full hidden group-hover/avatar:flex items-center justify-center backdrop-blur-[1px] transition-all animate-in fade-in duration-200">
                <Pencil size={12} className="text-white" strokeWidth={2.5} />
            </div>
        )}
    </div>
);

const UserIcon: React.FC = () => {
    const size = useResponsiveValue(24, 29);
    return <User size={size} className="text-[var(--theme-icon-user)] flex-shrink-0" strokeWidth={2} />;
};

const BotIcon: React.FC = () => {
    const size = useResponsiveValue(24, 29);
    return <Bot size={size} className="text-[var(--theme-icon-model)] flex-shrink-0" strokeWidth={2} />;
};

const ErrorMsgIcon: React.FC = () => {
    const size = useResponsiveValue(24, 29);
    return <AlertTriangle size={size} className="text-[var(--theme-icon-error)] flex-shrink-0" strokeWidth={2} />;
};

interface MessageActionsProps {
    message: ChatMessage;
    sessionTitle?: string;
    messageIndex?: number;
    isGrouped: boolean;
    onEditMessage: (messageId: string, mode: 'update' | 'resend') => void;
    onDeleteMessage: (messageId: string) => void;
    onRetryMessage: (messageId: string) => void;
    onTextToSpeech: (messageId: string, text: string) => void;
    onGenerateCanvas: (messageId: string, text: string) => void;
    onContinueGeneration: (messageId: string) => void;
    ttsMessageId: string | null;
    themeColors: ThemeColors;
    themeId: string;
    t: (key: keyof typeof translations) => string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
    message,
    sessionTitle,
    messageIndex,
    isGrouped,
    onEditMessage,
    onDeleteMessage,
    onRetryMessage,
    onTextToSpeech,
    onGenerateCanvas,
    onContinueGeneration,
    ttsMessageId,
    themeColors,
    themeId,
    t
}) => {
    const actionIconSize = useResponsiveValue(15, 16); 
    const showRetryButton = (message.role === 'model' || (message.role === 'error' && message.generationStartTime));
    const isThisMessageLoadingTts = ttsMessageId === message.id;
    
    // Enhanced button styling: lighter default, distinct hover, rounded corners
    const actionButtonClasses = "p-1.5 rounded-lg text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] opacity-80 hover:opacity-100 hover:scale-105 active:scale-95";

    return (
        <div className="flex-shrink-0 w-8 sm:w-10 flex flex-col items-center sticky top-2 sm:top-4 self-start z-10 h-full">
            <div className="h-7 sm:h-8 flex items-center justify-center">
                {!isGrouped && (
                    <>
                        {message.role === 'user' && (
                            <AvatarWrapper onClick={() => onEditMessage(message.id, 'update')} showEditOverlay={true}>
                                <UserIcon />
                            </AvatarWrapper>
                        )}
                        {message.role === 'model' && (
                            <AvatarWrapper onClick={() => onEditMessage(message.id, 'update')} showEditOverlay={true}>
                                <BotIcon />
                            </AvatarWrapper>
                        )}
                        {message.role === 'error' && <ErrorMsgIcon />}
                    </>
                )}
            </div>
            
            {/* Container for actions - Fades in on group hover with a subtle slide effect */}
            <div
                className="message-actions flex flex-col items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-300 ease-in-out translate-y-1 group-hover:translate-y-0"
            >
                {message.role === 'user' && !message.isLoading && (
                    <button 
                        onClick={() => onEditMessage(message.id, 'resend')} 
                        title={t('edit')} 
                        aria-label={t('edit')} 
                        className={actionButtonClasses}
                    >
                        <Edit3 size={actionIconSize} strokeWidth={2} />
                    </button>
                )}
                
                {showRetryButton && (
                    <button 
                        onClick={() => onRetryMessage(message.id)} 
                        title={message.isLoading ? t('retry_and_stop_button_title') : t('retry_button_title')} 
                        aria-label={message.isLoading ? t('retry_and_stop_button_title') : t('retry_button_title')} 
                        className={actionButtonClasses}
                    >
                        <RotateCw size={actionIconSize} strokeWidth={2} />
                    </button>
                )}

                {message.role === 'model' && !message.isLoading && (
                    <button 
                        onClick={() => onContinueGeneration(message.id)} 
                        title="Continue Generating" 
                        aria-label="Continue Generating" 
                        className={actionButtonClasses}
                    >
                        <CirclePlay size={actionIconSize} strokeWidth={2} />
                    </button>
                )}
                
                {(message.content || message.thoughts) && !message.isLoading && (
                    <MessageCopyButton 
                        textToCopy={message.content} 
                        t={t} 
                        className={actionButtonClasses} 
                        iconSize={actionIconSize} 
                    />
                )}
                
                {message.content && !message.isLoading && message.role === 'model' && !message.audioSrc && (
                    <>
                        {/* Canvas Generation Button */}
                        <button
                            onClick={() => onGenerateCanvas(message.id, message.content)}
                            title={t('generate_canvas_title')}
                            aria-label={t('generate_canvas_title')}
                            className={actionButtonClasses}
                        >
                            <Wand2 size={actionIconSize} strokeWidth={2} />
                        </button>

                        <button 
                            onClick={() => onTextToSpeech(message.id, message.content)} 
                            disabled={!!ttsMessageId} 
                            title="Read aloud" 
                            aria-label="Read message aloud" 
                            className={`${actionButtonClasses} disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                            {isThisMessageLoadingTts ? <Loader2 size={actionIconSize} className="animate-spin" strokeWidth={2} /> : <Volume2 size={actionIconSize} strokeWidth={2} />}
                        </button>
                        <ExportMessageButton 
                            message={message}
                            sessionTitle={sessionTitle}
                            messageIndex={messageIndex}
                            themeColors={themeColors} 
                            themeId={themeId} 
                            t={t} 
                            className={actionButtonClasses} 
                            iconSize={actionIconSize} 
                        />
                    </>
                )}
                
                {!message.isLoading && (
                    <button 
                        onClick={() => onDeleteMessage(message.id)} 
                        title={t('delete')} 
                        aria-label={t('delete')} 
                        className={`${actionButtonClasses} hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10`}
                    >
                        <Trash2 size={actionIconSize} strokeWidth={2} />
                    </button>
                )}
            </div>
        </div>
    );
};
