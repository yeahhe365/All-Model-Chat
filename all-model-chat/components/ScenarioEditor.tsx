import React, { useState } from 'react';
import { PreloadedMessage, SavedScenario } from '../types';
import { User, Bot, PlusCircle, Trash2, Edit3, FileUp, FileDown } from 'lucide-react';
import { getResponsiveValue, translations } from '../utils/appUtils';

interface ScenarioEditorProps {
    initialScenario: SavedScenario | null;
    onSave: (scenario: SavedScenario) => void;
    onCancel: () => void;
    t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({ initialScenario, onSave, onCancel, t }) => {
    const [scenario, setScenario] = useState<SavedScenario>(initialScenario || { id: Date.now().toString(), title: '', messages: [] });
    const [editingMessage, setEditingMessage] = useState<PreloadedMessage | null>(null);
    const [newMessageRole, setNewMessageRole] = useState<'user' | 'model'>('user');
    const [newMessageContent, setNewMessageContent] = useState('');
    
    const actionIconSize = getResponsiveValue(14, 16);
    const listItemIconSize = getResponsiveValue(12, 14);

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
                <label htmlFor="scenario-title" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1 block">Scenario Title</label>
                <input
                    id="scenario-title"
                    type="text"
                    value={scenario.title}
                    onChange={(e) => setScenario(prev => ({...prev, title: e.target.value}))}
                    placeholder="Enter a descriptive title..."
                    className="w-full p-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm"
                />
            </div>

            {/* Message Editor/Adder */}
            <div className="mb-4 p-3 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)] shadow-inner">
                <h3 className="text-xs font-medium text-[var(--theme-text-secondary)] mb-2">{editingMessage ? t('scenarios_editor_edit_title') : t('scenarios_editor_add_title')}</h3>
                <div className="flex items-center gap-2 mb-2">
                    <select value={newMessageRole} onChange={(e) => setNewMessageRole(e.target.value as 'user' | 'model')} className="bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] text-xs rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] p-1.5 w-auto">
                        <option value="user">{t('scenarios_editor_role_user')}</option>
                        <option value="model">{t('scenarios_editor_role_model')}</option>
                    </select>
                    <textarea id="new-message-content" value={newMessageContent} onChange={(e) => setNewMessageContent(e.target.value)} rows={2} className="flex-grow p-1.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-xs resize-y" placeholder={t('scenarios_editor_content_placeholder')} />
                </div>
                <div className="flex justify-end gap-2">
                    {editingMessage && <button onClick={() => { setEditingMessage(null); setNewMessageContent(''); }} className="px-2 py-1 text-xs bg-[var(--theme-bg-input)] hover:bg-[var(--theme-border-primary)] text-[var(--theme-text-secondary)] rounded-md transition-colors">{t('scenarios_editor_cancel_button')}</button>}
                    <button onClick={handleAddOrUpdateMessage} className="px-2 py-1 text-xs bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-md transition-colors flex items-center"><PlusCircle size={listItemIconSize} className="mr-1" /> {editingMessage ? t('scenarios_editor_update_button') : t('scenarios_editor_add_button')}</button>
                </div>
            </div>

            {/* Messages List */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-0.5 -mr-0.5">
                {scenario.messages.length === 0 ? <p className="text-xs text-[var(--theme-text-tertiary)] text-center py-4">{t('scenarios_empty_list')}</p> :
                    <ul className="space-y-1.5">
                        {scenario.messages.map((msg, index) => (
                            <li key={msg.id} className="p-2 bg-[var(--theme-bg-input)] rounded-md border border-[var(--theme-border-secondary)] flex items-start gap-2 text-xs">
                                <div className={`p-1 rounded-full ${msg.role === 'user' ? 'bg-[var(--theme-icon-user)]' : 'bg-[var(--theme-icon-model)]'} text-white mt-0.5`}><div className="w-3 h-3">{msg.role === 'user' ? <User size={listItemIconSize} /> : <Bot size={listItemIconSize} />}</div></div>
                                <p className="flex-grow min-w-0 text-[var(--theme-text-primary)] whitespace-pre-wrap break-words">{msg.content}</p>
                                <div className="flex-shrink-0 flex items-center gap-1 ml-1">
                                    <button onClick={() => moveMessage(index, 'up')} disabled={index === 0} className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] disabled:opacity-30"><FileUp size={actionIconSize-2} /></button>
                                    <button onClick={() => moveMessage(index, 'down')} disabled={index === scenario.messages.length - 1} className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] disabled:opacity-30"><FileDown size={actionIconSize-2} /></button>
                                    <button onClick={() => handleEditMessage(msg)} className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)]"><Edit3 size={actionIconSize-2} /></button>
                                    <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)]"><Trash2 size={actionIconSize-2} /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                }
            </div>
        </div>
        <div className="mt-auto pt-4 border-t border-[var(--theme-border-primary)] flex justify-end gap-3">
             <button onClick={onCancel} className="px-4 py-2 text-sm bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-border-primary)] text-[var(--theme-text-primary)] rounded-md transition-colors">Cancel</button>
             <button onClick={() => onSave(scenario)} disabled={!scenario.title.trim()} className="px-4 py-2 text-sm bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-md transition-colors disabled:opacity-50">Save Scenario</button>
        </div>
        </>
    );
};
