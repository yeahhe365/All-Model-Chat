
import React, { useRef, useEffect } from 'react';
import { PreloadedMessage } from '../../../types';
import { User, Bot, ArrowUp, ArrowDown, Edit3, Trash2, MessageSquare } from 'lucide-react';

interface ScenarioMessageListProps {
    messages: PreloadedMessage[];
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    onUpdateMessage: (id: string, content: string) => void;
    onDeleteMessage: (id: string) => void;
    onMoveMessage: (index: number, direction: -1 | 1) => void;
    readOnly: boolean;
}

export const ScenarioMessageList: React.FC<ScenarioMessageListProps> = ({
    messages,
    editingMessageId,
    setEditingMessageId,
    onUpdateMessage,
    onDeleteMessage,
    onMoveMessage,
    readOnly
}) => {
    const listRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom if adding new messages (heuristic: if editingId is null and length increased, handled by parent usually, 
    // but here we just expose the ref or handle scroll on prop change if needed. 
    // For simplicity, we'll let parent handle "scroll on add" via a ref if needed, or do it here on length change.)
    useEffect(() => {
        if (listRef.current && !editingMessageId) {
            // Check if we are near bottom or just added? 
            // Simple approach: scroll to bottom on length increase
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages.length, editingMessageId]);

    return (
        <div 
            ref={listRef}
            className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4 sm:space-y-6"
        >
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--theme-text-tertiary)] opacity-60">
                    <div className="p-4 rounded-full bg-[var(--theme-bg-secondary)] mb-4">
                        <MessageSquare size={32} className="opacity-50" />
                    </div>
                    <p className="text-sm font-medium">No messages yet.</p>
                    <p className="text-xs mt-1">Add messages below to script the conversation flow.</p>
                </div>
            ) : (
                messages.map((msg, index) => {
                    const isEditing = editingMessageId === msg.id;
                    const isUser = msg.role === 'user';
                    
                    return (
                        <div 
                            key={msg.id} 
                            className={`group flex gap-3 sm:gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                        >
                            {/* Avatar */}
                            <div className={`
                                flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-sm mt-1 border
                                ${isUser 
                                    ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] border-transparent' 
                                    : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] border-[var(--theme-border-secondary)]'}
                            `}>
                                {isUser ? <User size={14} strokeWidth={2.5} /> : <Bot size={14} strokeWidth={2.5} />}
                            </div>

                            {/* Bubble */}
                            <div className={`relative max-w-[85%] sm:max-w-[75%]`}>
                                <div className={`
                                    rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm shadow-sm whitespace-pre-wrap break-words border transition-all
                                    ${isUser 
                                        ? 'bg-[var(--theme-bg-secondary)] border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] rounded-tr-sm hover:border-[var(--theme-border-focus)]' 
                                        : 'bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] rounded-tl-sm hover:border-[var(--theme-border-focus)]'}
                                `}>
                                    {isEditing ? (
                                        <div className="flex flex-col gap-2 min-w-[240px] sm:min-w-[280px]">
                                            <textarea
                                                className="w-full bg-[var(--theme-bg-primary)] border border-[var(--theme-border-focus)] rounded-md p-3 text-inherit outline-none resize-y focus:ring-2 focus:ring-[var(--theme-border-focus)]/20"
                                                defaultValue={msg.content}
                                                autoFocus
                                                rows={4}
                                                onBlur={(e) => onUpdateMessage(msg.id, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        onUpdateMessage(msg.id, e.currentTarget.value);
                                                    }
                                                }}
                                            />
                                            <div className="text-[10px] opacity-60 text-right font-medium uppercase tracking-wide">Press Enter to save</div>
                                        </div>
                                    ) : (
                                        <div className="leading-relaxed">{msg.content}</div>
                                    )}
                                </div>

                                {/* Floating Actions */}
                                {!isEditing && !readOnly && (
                                    <div className={`
                                        absolute -top-3 ${isUser ? 'right-0' : 'left-0'} 
                                        flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200
                                        bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] shadow-lg rounded-full px-1.5 py-1 z-10 scale-95 group-hover:scale-100
                                    `}>
                                        <button onClick={() => onMoveMessage(index, -1)} disabled={index === 0} className="p-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full hover:text-[var(--theme-text-primary)] text-[var(--theme-text-tertiary)] disabled:opacity-30 transition-colors"><ArrowUp size={12} /></button>
                                        <button onClick={() => onMoveMessage(index, 1)} disabled={index === messages.length - 1} className="p-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full hover:text-[var(--theme-text-primary)] text-[var(--theme-text-tertiary)] disabled:opacity-30 transition-colors"><ArrowDown size={12} /></button>
                                        <div className="w-px h-3 bg-[var(--theme-border-secondary)] mx-0.5"></div>
                                        <button onClick={() => setEditingMessageId(msg.id)} className="p-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full hover:text-[var(--theme-text-link)] text-[var(--theme-text-tertiary)] transition-colors"><Edit3 size={12} /></button>
                                        <button onClick={() => onDeleteMessage(msg.id)} className="p-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full hover:text-[var(--theme-text-danger)] text-[var(--theme-text-tertiary)] transition-colors"><Trash2 size={12} /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};
