
import React from 'react';
import { User, Bot, Send } from 'lucide-react';
import { translations } from '../../../utils/appUtils';

interface ScenarioMessageInputProps {
    role: 'user' | 'model';
    setRole: (role: 'user' | 'model') => void;
    content: string;
    setContent: (content: string) => void;
    onAdd: () => void;
    inputRef: React.RefObject<HTMLTextAreaElement>;
    readOnly: boolean;
    t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ScenarioMessageInput: React.FC<ScenarioMessageInputProps> = ({
    role,
    setRole,
    content,
    setContent,
    onAdd,
    inputRef,
    readOnly,
    t
}) => {
    if (readOnly) return null;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            onAdd();
        }
    };

    return (
        <div className="flex-shrink-0 p-3 sm:p-4 bg-[var(--theme-bg-secondary)]/30 border-t border-[var(--theme-border-secondary)] backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-bold text-[var(--theme-text-tertiary)] uppercase tracking-wider">Add Message As</span>
                <div className="flex bg-[var(--theme-bg-input)] p-0.5 rounded-lg border border-[var(--theme-border-secondary)]">
                    <button
                        onClick={() => setRole('user')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${role === 'user' ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'}`}
                    >
                        <User size={12} /> User
                    </button>
                    <button
                        onClick={() => setRole('model')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${role === 'model' ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'}`}
                    >
                        <Bot size={12} /> Model
                    </button>
                </div>
            </div>
            
            <div className="relative group">
                <textarea
                    ref={inputRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('scenarios_editor_content_placeholder')}
                    className="w-full p-4 pr-14 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] resize-none shadow-sm transition-all"
                    rows={2}
                />
                <button
                    onClick={onAdd}
                    disabled={!content.trim()}
                    className="absolute right-2 bottom-2 p-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 transform"
                >
                    <Send size={18} strokeWidth={2.5} />
                </button>
            </div>
            <div className="text-[10px] text-[var(--theme-text-tertiary)] mt-2 text-center font-medium opacity-60">
                CMD/CTRL + Enter to Add
            </div>
        </div>
    );
};
