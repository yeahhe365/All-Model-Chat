
import React, { useState, useRef } from 'react';
import { SavedScenario } from '../../types';
import { translations } from '../../utils/appUtils';
import { TextEditorModal } from '../modals/TextEditorModal';
import { ScenarioEditorHeader } from './editor/ScenarioEditorHeader';
import { ScenarioSystemPrompt } from './editor/ScenarioSystemPrompt';
import { ScenarioMessageList } from './editor/ScenarioMessageList';
import { ScenarioMessageInput } from './editor/ScenarioMessageInput';

interface ScenarioEditorProps {
    initialScenario: SavedScenario | null;
    onSave: (scenario: SavedScenario) => void;
    onCancel: () => void;
    t: (key: keyof typeof translations, fallback?: string) => string;
    readOnly?: boolean;
}

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({ initialScenario, onSave, onCancel, t, readOnly = false }) => {
    const [scenario, setScenario] = useState<SavedScenario>(initialScenario || { id: Date.now().toString(), title: '', messages: [], systemInstruction: '' });
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [newMessageRole, setNewMessageRole] = useState<'user' | 'model'>('user');
    const [newMessageContent, setNewMessageContent] = useState('');
    const [isSystemPromptExpanded, setIsSystemPromptExpanded] = useState(false);
    
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleAddMessage = () => {
        if (!newMessageContent.trim() || readOnly) return;
        setScenario(prev => ({
            ...prev,
            messages: [...prev.messages, { id: Date.now().toString(), role: newMessageRole, content: newMessageContent }]
        }));
        setNewMessageContent('');
        setNewMessageRole(newMessageRole === 'user' ? 'model' : 'user');
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleUpdateMessage = (id: string, content: string) => {
        if (readOnly) return;
        setScenario(prev => ({
            ...prev,
            messages: prev.messages.map(m => m.id === id ? { ...m, content } : m)
        }));
        setEditingMessageId(null);
    };

    const handleDeleteMessage = (id: string) => {
        if (readOnly) return;
        setScenario(prev => ({
            ...prev,
            messages: prev.messages.filter(m => m.id !== id)
        }));
    };

    const handleMoveMessage = (index: number, direction: -1 | 1) => {
        if (readOnly) return;
        if (index + direction < 0 || index + direction >= scenario.messages.length) return;
        const newMessages = [...scenario.messages];
        const temp = newMessages[index];
        newMessages[index] = newMessages[index + direction];
        newMessages[index + direction] = temp;
        setScenario(prev => ({ ...prev, messages: newMessages }));
    };

    return (
        <div className="flex flex-col h-full bg-[var(--theme-bg-primary)] rounded-xl sm:rounded-2xl overflow-hidden border border-[var(--theme-border-secondary)] shadow-sm">
            
            <ScenarioEditorHeader 
                title={scenario.title}
                setTitle={(title) => setScenario(prev => ({ ...prev, title }))}
                onSave={() => onSave(scenario)}
                onCancel={onCancel}
                onOpenSystemPrompt={() => setIsSystemPromptExpanded(true)}
                isSaveDisabled={!scenario.title.trim()}
                readOnly={readOnly}
                t={t}
            />

            <div className="flex flex-col md:flex-row flex-grow min-h-0 overflow-hidden">
                
                <ScenarioSystemPrompt 
                    value={scenario.systemInstruction || ''}
                    onChange={(val) => setScenario(prev => ({ ...prev, systemInstruction: val }))}
                    onExpand={() => setIsSystemPromptExpanded(true)}
                    readOnly={readOnly}
                    t={t}
                />

                <TextEditorModal
                    isOpen={isSystemPromptExpanded}
                    onClose={() => setIsSystemPromptExpanded(false)}
                    title={t('scenarios_system_prompt_label')}
                    value={scenario.systemInstruction || ''}
                    onChange={(val) => setScenario(prev => ({...prev, systemInstruction: val}))}
                    placeholder={t('scenarios_system_prompt_placeholder')}
                    t={t}
                    readOnly={readOnly}
                />

                <div className="flex-1 flex flex-col min-w-0 bg-[var(--theme-bg-primary)]">
                    <ScenarioMessageList 
                        messages={scenario.messages}
                        editingMessageId={editingMessageId}
                        setEditingMessageId={setEditingMessageId}
                        onUpdateMessage={handleUpdateMessage}
                        onDeleteMessage={handleDeleteMessage}
                        onMoveMessage={handleMoveMessage}
                        readOnly={readOnly}
                    />

                    <ScenarioMessageInput 
                        role={newMessageRole}
                        setRole={setNewMessageRole}
                        content={newMessageContent}
                        setContent={setNewMessageContent}
                        onAdd={handleAddMessage}
                        inputRef={inputRef}
                        readOnly={readOnly}
                        t={t}
                    />
                </div>
            </div>
        </div>
    );
};
