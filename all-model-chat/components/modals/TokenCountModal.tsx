
import React from 'react';
import { Modal } from '../shared/Modal';
import { UploadedFile, AppSettings, ModelOption } from '../../types';
import { X, Calculator } from 'lucide-react';
import { ModelPicker } from '../shared/ModelPicker';
import { useTokenCountLogic } from '../../hooks/features/useTokenCountLogic';
import { TokenCountInput } from './token-count/TokenCountInput';
import { TokenCountFiles } from './token-count/TokenCountFiles';
import { TokenCountFooter } from './token-count/TokenCountFooter';

interface TokenCountModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialText: string;
    initialFiles: UploadedFile[];
    appSettings: AppSettings;
    availableModels: ModelOption[];
    currentModelId: string;
    t: (key: string) => string;
}

export const TokenCountModal: React.FC<TokenCountModalProps> = (props) => {
    const { isOpen, onClose, t, availableModels } = props;
    
    const {
        text, setText,
        files,
        selectedModelId,
        tokenCount,
        isLoading,
        error,
        fileInputRef,
        handleFileChange,
        removeFile,
        clearAll,
        handleCalculateClick,
        handleModelSelect,
        setTokenCount
    } = useTokenCountLogic(props);

    const displayModelName = availableModels.find(m => m.id === selectedModelId)?.name || selectedModelId;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            contentClassName="w-full max-w-2xl bg-[var(--theme-bg-primary)] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[var(--theme-border-primary)] max-h-[85vh]"
            noPadding
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/50">
                <h2 className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
                    <Calculator size={20} className="text-[var(--theme-text-link)]" />
                    {t('tokenModal_title')}
                </h2>
                <button onClick={onClose} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-grow flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-5">
                
                {/* Model Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--theme-text-tertiary)] tracking-wider">
                        {t('tokenModal_model')}
                    </label>
                    <ModelPicker
                        models={availableModels}
                        selectedId={selectedModelId}
                        onSelect={handleModelSelect}
                        t={t}
                        dropdownClassName="w-full max-h-60"
                        renderTrigger={({ isOpen, setIsOpen }) => (
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg text-sm text-[var(--theme-text-primary)] hover:border-[var(--theme-border-focus)] transition-colors focus:ring-2 focus:ring-[var(--theme-border-focus)] outline-none"
                            >
                                <span>{displayModelName}</span>
                                <span className="text-xs text-[var(--theme-text-tertiary)] font-mono">{selectedModelId}</span>
                            </button>
                        )}
                    />
                </div>

                <TokenCountInput 
                    text={text} 
                    onChange={(newText) => { setText(newText); setTokenCount(null); }} 
                    t={t} 
                />

                <TokenCountFiles 
                    files={files}
                    fileInputRef={fileInputRef}
                    onFileChange={handleFileChange}
                    onRemoveFile={removeFile}
                    t={t}
                />

                {/* Error Display */}
                {error && (
                    <div className="p-3 rounded-lg bg-[var(--theme-bg-danger)]/10 border border-[var(--theme-bg-danger)]/20 text-sm text-[var(--theme-text-danger)] animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                )}
            </div>

            <TokenCountFooter 
                tokenCount={tokenCount}
                isLoading={isLoading}
                hasContent={!!text.trim() || files.length > 0}
                onClear={clearAll}
                onCalculate={handleCalculateClick}
                t={t}
            />
        </Modal>
    );
};
