
import React, { useState, useEffect, useRef } from 'react';
import { SavedScenario } from '../../types';
import { User, Bot, Trash2, Edit3, ArrowUp, ArrowDown, Save, Send, Maximize2, X, MessageSquare, ChevronLeft, Settings2 } from 'lucide-react';
import { translations } from '../../utils/appUtils';
import { TextEditorModal } from '../modals/TextEditorModal';

interface ScenarioEditorProps {
    initialScenario: SavedScenario | null;
    onSave: (scenario: SavedScenario) => void;
    onCancel: () => void;
    t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({ initialScenario, onSave, onCancel, t }) => {
    const [scenario, setScenario] = useState<SavedScenario>(initialScenario || { id: Date.now().toString(), title: '', messages: [], systemInstruction: '' });
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [newMessageRole, setNewMessageRole] = useState<'user' | 'model'>('user');
    const [newMessageContent, setNewMessageContent] = useState('');
    const [isSystemPromptExpanded, setIsSystemPromptExpanded] = useState(false);
    
    const messageListRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Scroll to bottom when adding messages
    useEffect(() => {
        if (messageListRef.current && !editingMessageId) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [scenario.messages.length, editingMessageId]);

    const handleAddMessage = () => {
        if (!newMessageContent.trim()) return;
        setScenario(prev => ({
            ...prev,
            messages: [...prev.messages, { id: Date.now().toString(), role: newMessageRole, content: newMessageContent }]
        }));
        setNewMessageContent('');
        setNewMessageRole(newMessageRole === 'user' ? 'model' : 'user');
        // Keep focus
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleUpdateMessage = (id: string, content: string) => {
        setScenario(prev => ({
            ...prev,
            messages: prev.messages.map(m => m.id === id ? { ...m, content } : m)
        }));
        setEditingMessageId(null);
    };

    const handleDeleteMessage = (id: string) => {
        setScenario(prev => ({
            ...prev,
            messages: prev.messages.filter(m => m.id !== id)
        }));
    };

    const handleMoveMessage = (index: number, direction: -1 | 1) => {
        if (index + direction < 0 || index + direction >= scenario.messages.length) return;
        const newMessages = [...scenario.messages];
        const temp = newMessages[index];
        newMessages[index] = newMessages[index + direction];
        newMessages[index + direction] = temp;
        setScenario(prev => ({ ...prev, messages: newMessages }));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleAddMessage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--theme-bg-primary)] rounded-xl sm:rounded-2xl overflow-hidden border border-[var(--theme-border-secondary)] shadow-sm">
            
            {/* 1. Header Toolbar */}
            <div className="bg-[var(--theme-bg-primary)] border-b border-[var(--theme-border-secondary)] p-3 sm:p-4 flex-shrink-0 z-10">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button 
                        onClick={onCancel}
                        className="hidden md:flex items-center gap-1.5 text-sm font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={16} /> Back
                    </button>
                    <div className="hidden md:block h-6 w-px bg-[var(--theme-border-secondary)]"></div>
                    
                    <input
                        type="text"
                        value={scenario.title}
                        onChange={(e) => setScenario(prev => ({...prev, title: e.target.value}))}
                        placeholder={t('scenarios_editor_title_placeholder', 'Scenario Title')}
                        className="flex-1 bg-transparent text-lg sm:text-xl font-bold text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] outline-none min-w-0"
                        autoFocus={!initialScenario}
                    />
                    
                    {/* Mobile System Prompt Trigger */}
                    <button
                        onClick={() => setIsSystemPromptExpanded(true)}
                        className="md:hidden p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                        title={t('scenarios_system_prompt_label')}
                    >
                        <Settings2 size={20} />
                    </button>

                    <button 
                        onClick={() => onSave(scenario)} 
                        disabled={!scenario.title.trim()} 
                        className="px-3 sm:px-5 py-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0"
                    >
                        <Save size={16} strokeWidth={2.5} /> 
                        <span className="hidden sm:inline">{t('save')}</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row flex-grow min-h-0 overflow-hidden">
                
                {/* 2. System Prompt Sidebar (Hidden on mobile, replaced by modal trigger) */}
                <div className="hidden md:flex w-80 border-r border-[var(--theme-border-secondary)] flex-col bg-[var(--theme-bg-secondary)] flex-shrink-0">
                    <div className="p-4 border-b border-[var(--theme-border-secondary)]/50">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center justify-between mb-2">
                            <span className="flex items-center gap-2"><Bot size={14} /> {t('scenarios_system_prompt_label')}</span>
                            <button
                                onClick={() => setIsSystemPromptExpanded(true)}
                                className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] rounded transition-colors"
                                title="Expand"
                            >
                                <Maximize2 size={12} />
                            </button>
                        </label>
                        <p className="text-[10px] text-[var(--theme-text-tertiary)] mb-3">Define the persona, style, and rules for the AI.</p>
                    </div>
                    <textarea
                        value={scenario.systemInstruction || ''}
                        onChange={(e) => setScenario(prev => ({...prev, systemInstruction: e.target.value}))}
                        placeholder={t('scenarios_system_prompt_placeholder')}
                        className="flex-grow w-full bg-transparent border-none outline-none p-4 text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] resize-none font-mono leading-relaxed custom-scrollbar focus:bg-[var(--theme-bg-input)]/50 transition-colors"
                    />
                </div>

                <TextEditorModal
                    isOpen={isSystemPromptExpanded}
                    onClose={() => setIsSystemPromptExpanded(false)}
                    title={t('scenarios_system_prompt_label')}
                    value={scenario.systemInstruction || ''}
                    onChange={(val) => setScenario(prev => ({...prev, systemInstruction: val}))}
                    placeholder={t('scenarios_system_prompt_placeholder')}
                    t={t}
                />

                {/* 3. Message Flow Editor */}
                <div className="flex-1 flex flex-col min-w-0 bg-[var(--theme-bg-primary)]">
                    {/* Messages List */}
                    <div 
                        ref={messageListRef}
                        className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4 sm:space-y-6"
                    >
                        {scenario.messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--theme-text-tertiary)] opacity-60">
                                <div className="p-4 rounded-full bg-[var(--theme-bg-secondary)] mb-4">
                                    <MessageSquare size={32} className="opacity-50" />
                                </div>
                                <p className="text-sm font-medium">No messages yet.</p>
                                <p className="text-xs mt-1">Add messages below to script the conversation flow.</p>
                            </div>
                        ) : (
                            scenario.messages.map((msg, index) => {
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
                                                            onBlur={(e) => handleUpdateMessage(msg.id, e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleUpdateMessage(msg.id, e.currentTarget.value);
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
                                            {!isEditing && (
                                                <div className={`
                                                    absolute -top-3 ${isUser ? 'right-0' : 'left-0'} 
                                                    flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200
                                                    bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] shadow-lg rounded-full px-1.5 py-1 z-10 scale-95 group-hover:scale-100
                                                `}>
                                                    <button onClick={() => handleMoveMessage(index, -1)} disabled={index === 0} className="p-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full hover:text-[var(--theme-text-primary)] text-[var(--theme-text-tertiary)] disabled:opacity-30 transition-colors"><ArrowUp size={12} /></button>
                                                    <button onClick={() => handleMoveMessage(index, 1)} disabled={index === scenario.messages.length - 1} className="p-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full hover:text-[var(--theme-text-primary)] text-[var(--theme-text-tertiary)] disabled:opacity-30 transition-colors"><ArrowDown size={12} /></button>
                                                    <div className="w-px h-3 bg-[var(--theme-border-secondary)] mx-0.5"></div>
                                                    <button onClick={() => setEditingMessageId(msg.id)} className="p-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full hover:text-[var(--theme-text-link)] text-[var(--theme-text-tertiary)] transition-colors"><Edit3 size={12} /></button>
                                                    <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full hover:text-[var(--theme-text-danger)] text-[var(--theme-text-tertiary)] transition-colors"><Trash2 size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="flex-shrink-0 p-3 sm:p-4 bg-[var(--theme-bg-secondary)]/30 border-t border-[var(--theme-border-secondary)] backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-[10px] font-bold text-[var(--theme-text-tertiary)] uppercase tracking-wider">Add Message As</span>
                            <div className="flex bg-[var(--theme-bg-input)] p-0.5 rounded-lg border border-[var(--theme-border-secondary)]">
                                <button
                                    onClick={() => setNewMessageRole('user')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${newMessageRole === 'user' ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'}`}
                                >
                                    <User size={12} /> User
                                </button>
                                <button
                                    onClick={() => setNewMessageRole('model')}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${newMessageRole === 'model' ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'}`}
                                >
                                    <Bot size={12} /> Model
                                </button>
                            </div>
                        </div>
                        
                        <div className="relative group">
                            <textarea
                                ref={inputRef}
                                value={newMessageContent}
                                onChange={(e) => setNewMessageContent(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('scenarios_editor_content_placeholder')}
                                className="w-full p-4 pr-14 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] resize-none shadow-sm transition-all"
                                rows={2}
                            />
                            <button
                                onClick={handleAddMessage}
                                disabled={!newMessageContent.trim()}
                                className="absolute right-2 bottom-2 p-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 transform"
                            >
                                <Send size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="text-[10px] text-[var(--theme-text-tertiary)] mt-2 text-center font-medium opacity-60">
                            CMD/CTRL + Enter to Add
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
