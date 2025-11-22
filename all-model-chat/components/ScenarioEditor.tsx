import React, { useState, useEffect, useRef } from 'react';
import { PreloadedMessage, SavedScenario } from '../types';
import { User, Bot, PlusCircle, Trash2, Edit3, FileUp, FileDown, MessageSquare, Save, X, CornerDownLeft } from 'lucide-react';
import { getResponsiveValue, translations } from '../utils/appUtils';

interface ScenarioEditorProps {
    initialScenario: SavedScenario | null;
    onSave: (scenario: SavedScenario) => void;
    onCancel: () => void;
    t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({ initialScenario, onSave, onCancel, t }) => {
    const [scenario, setScenario] = useState<SavedScenario>(initialScenario || { id: Date.now().toString(), title: '', messages: [], systemInstruction: '' });
    const [editingMessage, setEditingMessage] = useState<PreloadedMessage | null>(null);
    const [newMessageRole, setNewMessageRole] = useState<'user' | 'model'>('user');
    const [newMessageContent, setNewMessageContent] = useState('');
    const messageListRef = useRef<HTMLDivElement>(null);
    
    const listItemIconSize = getResponsiveValue(16, 18);

    // Scroll to bottom when a message is added
    useEffect(() => {
        if (messageListRef.current && !editingMessage) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [scenario.messages.length, editingMessage]);

    const handleMessageChange = (messages: PreloadedMessage[]) => {
        setScenario(prev => ({...prev, messages}));
    }

    const handleAddOrUpdateMessage = () => {
        if (!newMessageContent.trim()) return;
        if (editingMessage) {
            handleMessageChange(scenario.messages.map(msg => msg.id === editingMessage.id ? { ...msg, role: newMessageRole, content: newMessageContent } : msg));
            setEditingMessage(null);
        } else {
            handleMessageChange([...scenario.messages, { id: Date.now().toString(), role: newMessageRole, content: newMessageContent }]);
        }
        setNewMessageContent('');
        setNewMessageRole(newMessageRole === 'user' ? 'model' : 'user'); // Toggle role for next message automatically
    };

    const handleEditMessage = (message: PreloadedMessage) => {
        setEditingMessage(message);
        setNewMessageRole(message.role);
        setNewMessageContent(message.content);
        document.getElementById('new-message-content')?.focus();
    };

    const handleDeleteMessage = (id: string) => {
        handleMessageChange(scenario.messages.filter((msg) => msg.id !== id));
        if (editingMessage?.id === id) {
            setEditingMessage(null);
            setNewMessageContent('');
        }
    };
    
    const moveMessage = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === scenario.messages.length - 1)) return;
        const newMessages = [...scenario.messages];
        const item = newMessages.splice(index, 1)[0];
        newMessages.splice(index + (direction === 'down' ? 1 : -1), 0, item);
        handleMessageChange(newMessages);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleAddOrUpdateMessage();
        }
    };

    return (
        <>
        <div className="flex-grow flex flex-col min-h-0 space-y-4 overflow-y-auto custom-scrollbar pr-2 -mr-2" ref={messageListRef}>
             {/* Title & System Prompt Card */}
             <div className="bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl p-4 shadow-sm space-y-4 flex-shrink-0">
                <div>
                    <label htmlFor="scenario-title" className="block text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] mb-1.5">{t('scenarios_editor_title_label')}</label>
                    <input
                        id="scenario-title"
                        type="text"
                        value={scenario.title}
                        onChange={(e) => setScenario(prev => ({...prev, title: e.target.value}))}
                        placeholder={t('scenarios_editor_title_placeholder')}
                        className="w-full p-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm transition-all"
                    />
                </div>
                <div>
                    <label htmlFor="scenario-system-prompt" className="block text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] mb-1.5">{t('scenarios_system_prompt_label')} <span className="font-normal text-[var(--theme-text-tertiary)] opacity-70">{t('scenarios_optional')}</span></label>
                    <textarea
                        id="scenario-system-prompt"
                        rows={2}
                        value={scenario.systemInstruction || ''}
                        onChange={(e) => setScenario(prev => ({...prev, systemInstruction: e.target.value}))}
                        placeholder={t('scenarios_system_prompt_placeholder', "Define the persona or rules for the model...")}
                        className="w-full p-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm resize-y custom-scrollbar transition-all"
                    />
                </div>
            </div>

            {/* Messages List */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] px-1">{t('scenarios_conversation_flow', "Conversation Flow")}</h3>
                {scenario.messages.length === 0 ? (
                    <div className="text-center py-8 text-sm text-[var(--theme-text-tertiary)] border-2 border-dashed border-[var(--theme-border-secondary)] rounded-xl bg-[var(--theme-bg-secondary)]/50">
                        <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                        <p>{t('scenarios_empty_list')}</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {scenario.messages.map((msg, index) => (
                            <li key={msg.id} className={`group flex gap-3 p-3 rounded-xl border transition-all hover:shadow-md ${msg.role === 'user' ? 'bg-[var(--theme-bg-primary)] border-[var(--theme-border-secondary)]' : 'bg-[var(--theme-bg-secondary)] border-transparent'}`}>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'}`}>
                                    {msg.role === 'user' ? <User size={listItemIconSize} strokeWidth={1.5} /> : <Bot size={listItemIconSize} strokeWidth={1.5} />}
                                </div>
                                <div className="flex-grow min-w-0 pt-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold uppercase text-[var(--theme-text-tertiary)]">{msg.role === 'user' ? t('scenarios_role_user', 'User') : t('scenarios_role_model', 'Model')}</span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => moveMessage(index, 'up')} disabled={index === 0} className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded" title={t('scenarios_moveUp_title')}><FileUp size={14} strokeWidth={1.5} /></button>
                                            <button onClick={() => moveMessage(index, 'down')} disabled={index === scenario.messages.length - 1} className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded" title={t('scenarios_moveDown_title')}><FileDown size={14} strokeWidth={1.5} /></button>
                                            <div className="w-px h-3 bg-[var(--theme-border-secondary)] mx-1"></div>
                                            <button onClick={() => handleEditMessage(msg)} className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] rounded" title={t('scenarios_edit_title')}><Edit3 size={14} strokeWidth={1.5} /></button>
                                            <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 rounded" title={t('scenarios_delete_title')}><Trash2 size={14} strokeWidth={1.5} /></button>
                                        </div>
                                    </div>
                                    <p className="text-[var(--theme-text-primary)] whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            {/* Spacer to push editor up if needed */}
            <div className="h-2"></div>
        </div>

        {/* Message Input Area - Fixed at bottom relative to content flow */}
        <div className="mt-auto pt-4 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-tertiary)] -mx-3 -mb-3 sm:-mx-5 sm:-mb-5 md:-mx-6 md:-mb-6 p-3 sm:p-5 md:p-6 rounded-b-xl sticky bottom-0 z-10">
            <div className="flex flex-col gap-3 bg-[var(--theme-bg-primary)] p-3 rounded-xl border border-[var(--theme-border-focus)] shadow-md">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
                        {editingMessage ? t('scenarios_editor_edit_title') : t('scenarios_editor_add_title')}
                    </span>
                    <div className="flex bg-[var(--theme-bg-secondary)] rounded-lg p-0.5">
                        <button
                            type="button"
                            onClick={() => setNewMessageRole('user')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${newMessageRole === 'user' ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'}`}
                        >
                            {t('scenarios_role_user', 'User')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setNewMessageRole('model')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${newMessageRole === 'model' ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'}`}
                        >
                            {t('scenarios_role_model', 'Model')}
                        </button>
                    </div>
                </div>
                <div className="relative">
                    <textarea 
                        id="new-message-content" 
                        value={newMessageContent} 
                        onChange={(e) => setNewMessageContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={3} 
                        className="w-full p-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm resize-none custom-scrollbar" 
                        placeholder={t('scenarios_editor_content_placeholder')} 
                    />
                    <div className="absolute bottom-2 right-2 flex gap-2">
                        {editingMessage && (
                            <button 
                                onClick={() => { setEditingMessage(null); setNewMessageContent(''); setNewMessageRole('user'); }} 
                                className="p-1.5 text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-colors text-xs"
                                title={t('scenarios_editor_cancel_button')}
                            >
                                <X size={16} strokeWidth={1.5} />
                            </button>
                        )}
                        <button 
                            onClick={handleAddOrUpdateMessage} 
                            disabled={!newMessageContent.trim()}
                            className="p-1.5 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-md transition-colors disabled:opacity-50 shadow-sm"
                            title={editingMessage ? t('scenarios_editor_update_button') : t('scenarios_editor_add_button')}
                        >
                            {editingMessage ? <Save size={16} strokeWidth={1.5} /> : <CornerDownLeft size={16} strokeWidth={1.5} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
                 <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] border border-transparent rounded-lg transition-colors">
                    {t('cancel', 'Cancel')}
                 </button>
                 <button onClick={() => onSave(scenario)} disabled={!scenario.title.trim()} className="px-6 py-2 text-sm font-medium bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    <Save size={16} strokeWidth={1.5} /> {t('scenarios_save_button', 'Save Scenario')}
                 </button>
            </div>
        </div>
        </>
    );
};