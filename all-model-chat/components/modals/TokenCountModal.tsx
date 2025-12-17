import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../shared/Modal';
import { UploadedFile, AppSettings, ModelOption } from '../../types';
import { X, Calculator, Plus, Loader2, Image as ImageIcon, FileText, Trash2, RefreshCw } from 'lucide-react';
import { ModelPicker } from '../shared/ModelPicker';
import { generateUniqueId, getKeyForRequest, buildContentParts, formatFileSize } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';
import { ALL_SUPPORTED_MIME_TYPES } from '../../constants/fileConstants';

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

export const TokenCountModal: React.FC<TokenCountModalProps> = ({
    isOpen,
    onClose,
    initialText,
    initialFiles,
    appSettings,
    availableModels,
    currentModelId,
    t
}) => {
    const [text, setText] = useState('');
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [selectedModelId, setSelectedModelId] = useState(currentModelId);
    const [tokenCount, setTokenCount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const performCalculation = async (txt: string, fls: UploadedFile[], modelId: string) => {
        if (!txt.trim() && fls.length === 0) return;
        
        setIsLoading(true);
        setError(null);
        setTokenCount(null);

        // We use a temporary settings object to derive the key, assuming current settings context
        const tempSettings = { ...appSettings, modelId: modelId };
        const keyResult = getKeyForRequest(appSettings, tempSettings, { skipIncrement: true });

        if ('error' in keyResult) {
            setError(keyResult.error);
            setIsLoading(false);
            return;
        }

        try {
            // Build parts (this handles file reading/base64 conversion)
            // Pass mediaResolution to ensure token count reflects the resolution setting
            const { contentParts } = await buildContentParts(txt, fls, modelId, appSettings.mediaResolution);
            
            if (contentParts.length === 0) {
                setTokenCount(0);
                return;
            }

            const count = await geminiServiceInstance.countTokens(keyResult.key, modelId, contentParts);
            setTokenCount(count);
        } catch (err) {
            console.error("Token calculation failed", err);
            setError(err instanceof Error ? err.message : "Failed to calculate tokens");
        } finally {
            setIsLoading(false);
        }
    };

    // Reset state and Auto-Calculate when modal opens
    useEffect(() => {
        if (isOpen) {
            setText(initialText);
            const shallowFiles = [...initialFiles];
            setFiles(shallowFiles);
            setSelectedModelId(currentModelId);
            setTokenCount(null);
            setError(null);

            // Auto calculate if there is content
            if (initialText.trim() || shallowFiles.length > 0) {
                performCalculation(initialText, shallowFiles, currentModelId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map(file => ({
                id: generateUniqueId(),
                name: file.name,
                type: file.type,
                size: file.size,
                rawFile: file,
                dataUrl: URL.createObjectURL(file), // Local preview
                uploadState: 'active' as const
            }));
            setFiles(prev => [...prev, ...newFiles]);
            setTokenCount(null); // Reset count on change
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        setTokenCount(null);
    };

    const handleCalculateClick = () => {
        performCalculation(text, files, selectedModelId);
    };

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
                        onSelect={(id) => { setSelectedModelId(id); setTokenCount(null); }}
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

                {/* Content Input */}
                <div className="space-y-2 flex-grow flex flex-col">
                    <label className="text-xs font-bold uppercase text-[var(--theme-text-tertiary)] tracking-wider">
                        {t('tokenModal_input')}
                    </label>
                    <textarea
                        value={text}
                        onChange={(e) => { setText(e.target.value); setTokenCount(null); }}
                        placeholder={t('tokenModal_placeholder')}
                        className="w-full flex-grow min-h-[120px] p-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent outline-none resize-none custom-scrollbar font-mono leading-relaxed"
                    />
                </div>

                {/* File Attachment */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase text-[var(--theme-text-tertiary)] tracking-wider">
                            {t('tokenModal_files')}
                        </label>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs flex items-center gap-1 text-[var(--theme-text-link)] hover:underline"
                        >
                            <Plus size={12} /> {t('add')}
                        </button>
                        <input 
                            type="file" 
                            multiple 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept={ALL_SUPPORTED_MIME_TYPES.join(',')} 
                        />
                    </div>
                    
                    {files.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {files.map(file => (
                                <div key={file.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--theme-bg-tertiary)]/50 border border-[var(--theme-border-secondary)] rounded-md text-xs group">
                                    <span className="text-[var(--theme-text-secondary)]">
                                        {file.type.startsWith('image/') ? <ImageIcon size={12} /> : <FileText size={12} />}
                                    </span>
                                    <span className="max-w-[150px] truncate text-[var(--theme-text-primary)]" title={file.name}>{file.name}</span>
                                    <span className="text-[var(--theme-text-tertiary)]">({formatFileSize(file.size)})</span>
                                    <button 
                                        onClick={() => removeFile(file.id)}
                                        className="ml-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-3 rounded-lg bg-[var(--theme-bg-danger)]/10 border border-[var(--theme-bg-danger)]/20 text-sm text-[var(--theme-text-danger)] animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {tokenCount !== null ? (
                        <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2">
                            <span className="text-xs text-[var(--theme-text-tertiary)] font-medium uppercase tracking-wide">Estimated Cost</span>
                            <span className="text-2xl font-bold text-[var(--theme-text-link)] font-mono tabular-nums">
                                {tokenCount.toLocaleString()} <span className="text-sm font-sans font-normal text-[var(--theme-text-secondary)]">tokens</span>
                            </span>
                        </div>
                    ) : (
                        <span className="text-sm text-[var(--theme-text-tertiary)] italic">Ready to calculate</span>
                    )}
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => { setText(''); setFiles([]); setTokenCount(null); }}
                        className="px-4 py-2 text-sm font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors flex items-center gap-2"
                        title="Clear All"
                    >
                        <Trash2 size={16} /> <span className="hidden sm:inline">{t('tokenModal_clear')}</span>
                    </button>
                    <button 
                        onClick={handleCalculateClick}
                        disabled={isLoading || (!text.trim() && files.length === 0)}
                        className="px-5 py-2 text-sm font-bold bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        {t('tokenModal_count')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};