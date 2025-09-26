import React, { useState } from 'react';
import { PreloadedMessage, SavedScenario } from '../types';
import { User, Bot, PlusCircle, Trash2, Edit3, FileUp, FileDown, MessageSquare, Save, X } from 'lucide-react';
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
    
    const actionIconSize = getResponsiveValue(14, 16);
    const listItemIconSize = getResponsiveValue(16, 18);

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
        setNewMessageRole('user');
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

    return (
        <>
        <div className="flex-grow flex flex-col min-h-0">
             {/* Title Editor */}
             <div className="mb-4">
                <label htmlFor="scenario-title" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('scenarios_editor_title_label')}</label>
                <input
                    id="scenario-title"
                    type="text"
                    value={scenario.title}
                    onChange={(e) => setScenario(prev => ({...prev, title: e.target.value}))}
                    placeholder={t('scenarios_editor_title_placeholder')}
                    className="w-full p-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-2 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm"
                />
            </div>
            
            {/* System Prompt Editor */}
            <div className="mb-4">
                <label htmlFor="scenario-system-prompt" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1.5">System Prompt (optional)</label>
                <textarea
                    id="scenario-system-prompt"
                    rows={3}
                    value={scenario.systemInstruction || ''}
                    onChange={(e) => setScenario(prev => ({...prev, systemInstruction: e.target.value}))}
                    placeholder="e.g., You are a helpful AI assistant."
                    className="w-full p-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-2 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm resize-y custom-scrollbar"
                />
            </div>

            {/* Message Editor/Adder */}
            <div className="mb-4 p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)] shadow-inner">
                <h3 className="text-sm font-semibold text-[var(--theme-text-secondary)] mb-3">{editingMessage ? t('scenarios_editor_edit_title') : t('scenarios_editor_add_title')}</h3>
                <div className="flex flex-col sm:flex-row items-start gap-3">
                    <div role="radiogroup" className="flex-shrink-0 bg-[var(--theme-bg-tertiary)] p-0.5 rounded-lg flex w-full sm:w-auto">
                        <button
                            type="button"
                            role="radio"
                            aria-checked={newMessageRole === 'user'}
                            onClick={() => setNewMessageRole('user')}
                            className={`flex-1 sm:w-auto text-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-focus)] flex items-center justify-center ${
                                newMessageRole === 'user'
                                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-link)] shadow-sm'
                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-input)]/50'
                            }`}
                        >
                            <User size={actionIconSize} className="mr-1.5" /> {t('scenarios_editor_role_user')}
                        </button>
                        <button
                            type="button"
                            role="radio"
                            aria-checked={newMessageRole === 'model'}
                            onClick={() => setNewMessageRole('model')}
                            className={`flex-1 sm:w-auto text-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-focus)] flex items-center justify-center ${
                                newMessageRole === 'model'
                                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-link)] shadow-sm'
                                : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-input)]/50'
                            }`}
                        >
                            <Bot size={actionIconSize} className="mr-1.5" /> {t('scenarios_editor_role_model')}
                        </button>
                    </div>
                    <textarea id="new-message-content" value={newMessageContent} onChange={(e) => setNewMessageContent(e.target.value)} rows={3} className="flex-grow w-full p-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-2 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm resize-y custom-scrollbar" placeholder={t('scenarios_editor_content_placeholder')} />
                </div>
                <div className="flex justify-end gap-2 mt-3">
                    {editingMessage && <button onClick={() => { setEditingMessage(null); setNewMessageContent(''); setNewMessageRole('user'); }} className="px-3 py-2 text-sm bg-[var(--theme-bg-input)] hover:bg-[var(--theme-border-primary)] text-[var(--theme-text-secondary)] rounded-md transition-colors">{t('scenarios_editor_cancel_button')}</button>}
                    <button onClick={handleAddOrUpdateMessage} className="px-4 py-2 text-sm bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-md transition-colors flex items-center gap-1.5">
                        <PlusCircle size={actionIconSize} /> 
                        {editingMessage ? t('scenarios_editor_update_button') : t('scenarios_editor_add_button')}
                    </button>
                </div>
            </div>

            {/* Messages List */}
            <div className="flex-grow overflow-y-auto custom-scrollbar -mr-2 pr-2">
                {scenario.messages.length === 0 ? (
                    <div className="text-center py-12 text-sm text-[var(--theme-text-tertiary)] border-2 border-dashed border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
                        <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
                        <p>{t('scenarios_empty_list')}</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {scenario.messages.map((msg, index) => (
                            <li key={msg.id} className="group p-2.5 bg-[var(--theme-bg-input)] rounded-lg border border-[var(--theme-border-secondary)] flex items-start gap-3 text-sm transition-colors hover:border-[var(--theme-border-focus)]">
                                <div className={`flex-shrink-0 p-1.5 rounded-full ${msg.role === 'user' ? 'bg-[var(--theme-icon-user)]' : 'bg-[var(--theme-icon-model)]'} bg-opacity-20 text-[var(--theme-text-primary)] mt-1`}>
                                    {msg.role === 'user' ? <User size={listItemIconSize} className="text-[var(--theme-icon-user)]"/> : <Bot size={listItemIconSize} className="text-[var(--theme-icon-model)]"/>}
                                </div>
                                <p className="flex-grow min-w-0 text-[var(--theme-text-primary)] whitespace-pre-wrap break-words py-1">{msg.content}</p>
                                <div className="flex-shrink-0 flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => moveMessage(index, 'up')} disabled={index === 0} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] disabled:opacity-30 rounded-md hover:bg-[var(--theme-bg-tertiary)]" title={t('scenarios_moveUp_title')}><FileUp size={actionIconSize} /></button>
                                    <button onClick={() => moveMessage(index, 'down')} disabled={index === scenario.messages.length - 1} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] disabled:opacity-30 rounded-md hover:bg-[var(--theme-bg-tertiary)]" title={t('scenarios_moveDown_title')}><FileDown size={actionIconSize} /></button>
                                    <button onClick={() => handleEditMessage(msg)} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] rounded-md hover:bg-[var(--theme-bg-tertiary)]" title={t('scenarios_edit_title')}><Edit3 size={actionIconSize} /></button>
                                    <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] rounded-md hover:bg-[var(--theme-bg-tertiary)]" title={t('scenarios_delete_title')}><Trash2 size={actionIconSize} /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
        <div className="flex-shrink-0 mt-4 pt-4 border-t border-[var(--theme-border-primary)] flex justify-end gap-3">
             <button onClick={onCancel} className="px-4 py-2 text-sm bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded-md transition-colors border border-[var(--theme-border-secondary)] flex items-center gap-1.5">
                <X size={actionIconSize} /> {t('cancel')}
             </button>
             <button onClick={() => onSave(scenario)} disabled={!scenario.title.trim()} className="px-4 py-2 text-sm bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <Save size={actionIconSize} /> {t('scenarios_save_button')}
             </button>
        </div>
        </>
    );
};