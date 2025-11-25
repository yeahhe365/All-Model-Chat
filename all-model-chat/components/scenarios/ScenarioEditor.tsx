
import React, { useState, useEffect, useRef } from 'react';
import { SavedScenario } from '../../types';
import { User, Bot, Trash2, Edit3, ArrowUp, Save, Plus } from 'lucide-react';
import { translations } from '../../utils/appUtils';

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
    
    const messageListRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleAddMessage();
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Top Settings Area */}
            <div className="flex-shrink-0 mb-4 space-y-3">
                <input
                    type="text"
                    value={scenario.title}
                    onChange={(e) => setScenario(prev => ({...prev, title: e.target.value}))}
                    placeholder={t('scenarios_editor_title_placeholder', 'Scenario Title')}
                    className="w-full bg-transparent text-2xl font-bold text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] outline-none border-b border-transparent hover:border-[var(--theme-border-secondary)] focus:border-[var(--theme-border-focus)] transition-colors py-1"
                    autoFocus={!initialScenario}
                />
                
                <details className="group bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl open:ring-1 open:ring-[var(--theme-border-focus)]">
                    <summary className="px-4 py-2.5 cursor-pointer text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors flex justify-between items-center select-none">
                        <span>{t('scenarios_system_prompt_label')}</span>
                        <span className="text-[var(--theme-text-tertiary)] text-[10px] font-normal normal-case group-open:hidden">
                            {scenario.systemInstruction ? 'Content Hidden' : 'Optional'}
                        </span>
                    </summary>
                    <div className="p-3 pt-0">
                        <textarea
                            rows={3}
                            value={scenario.systemInstruction || ''}
                            onChange={(e) => setScenario(prev => ({...prev, systemInstruction: e.target.value}))}
                            placeholder={t('scenarios_system_prompt_placeholder', "Define the persona or rules for the model...")}
                            className="w-full p-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm resize-y custom-scrollbar"
                        />
                    </div>
                </details>
            </div>

            {/* Chat Preview Area */}
            <div 
                ref={messageListRef}
                className="flex-grow overflow-y-auto custom-scrollbar space-y-4 p-2 -mx-2 relative"
            >
                {scenario.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--theme-text-tertiary)] opacity-60">
                        <div className="p-4 border-2 border-dashed border-[var(--theme-border-secondary)] rounded-xl mb-2">
                            <Plus size={24} />
                        </div>
                        <p className="text-sm">Add messages below to build the conversation flow.</p>
                    </div>
                ) : (
                    scenario.messages.map((msg) => {
                        const isEditing = editingMessageId === msg.id;
                        return (
                            <div 
                                key={msg.id} 
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                            >
                                <div className={`
                                    relative max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 text-sm
                                    ${msg.role === 'user' 
                                        ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] rounded-tr-sm' 
                                        : 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)] rounded-tl-sm'}
                                `}>
                                    {isEditing ? (
                                        <div className="flex flex-col gap-2 min-w-[280px]">
                                            <textarea
                                                className="w-full bg-black/10 dark:bg-white/10 rounded-md p-2 text-inherit outline-none resize-y"
                                                defaultValue={msg.content}
                                                autoFocus
                                                rows={3}
                                                onBlur={(e) => handleUpdateMessage(msg.id, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleUpdateMessage(msg.id, e.currentTarget.value);
                                                    }
                                                }}
                                            />
                                            <div className="text-[10px] opacity-70 text-right">Press Enter to save</div>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                    )}

                                    {/* Inline Controls */}
                                    {!isEditing && (
                                        <div className={`absolute ${msg.role === 'user' ? 'right-0 translate-x-[110%]' : 'left-0 -translate-x-[110%]'} top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                            <button 
                                                onClick={() => setEditingMessageId(msg.id)} 
                                                className="p-1.5 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] rounded-full shadow-sm"
                                            >
                                                <Edit3 size={12} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteMessage(msg.id)} 
                                                className="p-1.5 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] rounded-full shadow-sm"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Message Input Area */}
            <div className="mt-4 pt-4 border-t border-[var(--theme-border-primary)] flex-shrink-0">
                <div className="bg-[var(--theme-bg-primary)] rounded-2xl border border-[var(--theme-border-secondary)] focus-within:border-[var(--theme-border-focus)] focus-within:ring-1 focus-within:ring-[var(--theme-border-focus)] transition-all shadow-sm p-1.5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 px-2 pt-1">
                        <div className="flex bg-[var(--theme-bg-tertiary)]/50 p-0.5 rounded-lg">
                            <button
                                onClick={() => setNewMessageRole('user')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${newMessageRole === 'user' ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'}`}
                            >
                                <User size={12} /> User
                            </button>
                            <button
                                onClick={() => setNewMessageRole('model')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${newMessageRole === 'model' ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'}`}
                            >
                                <Bot size={12} /> Model
                            </button>
                        </div>
                    </div>
                    <div className="flex items-end gap-2 px-1 pb-1">
                        <textarea
                            ref={inputRef}
                            value={newMessageContent}
                            onChange={(e) => setNewMessageContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('scenarios_editor_content_placeholder')}
                            className="w-full bg-transparent border-none outline-none text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] resize-none max-h-32 p-2"
                            rows={1}
                            style={{ minHeight: '40px' }}
                        />
                        <button
                            onClick={handleAddMessage}
                            disabled={!newMessageContent.trim()}
                            className="p-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95 mb-0.5 mr-0.5"
                        >
                            <ArrowUp size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] rounded-xl transition-colors">
                        {t('cancel', 'Cancel')}
                    </button>
                    <button onClick={() => onSave(scenario)} disabled={!scenario.title.trim()} className="px-6 py-2 text-sm font-medium bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-xl transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        <Save size={16} /> {t('scenarios_save_button', 'Save Scenario')}
                    </button>
                </div>
            </div>
        </div>
    );
};
