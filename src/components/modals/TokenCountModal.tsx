import React from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { Modal } from '../shared/Modal';
import { UploadedFile, AppSettings, ModelOption } from '../../types';
import { ChevronDown, X, Calculator } from 'lucide-react';
import { getModelIcon, ModelPicker } from '../shared/ModelPicker';
import { useTokenCountLogic } from '../../hooks/features/useTokenCountLogic';
import { TokenCountInput } from './token-count/TokenCountInput';
import { TokenCountFiles } from './token-count/TokenCountFiles';
import { TokenCountFooter } from './token-count/TokenCountFooter';
import { MODAL_CLOSE_BUTTON_CLASS } from '../../constants/appConstants';

interface TokenCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  initialFiles: UploadedFile[];
  appSettings: AppSettings;
  availableModels: ModelOption[];
  currentModelId: string;
}

export const TokenCountModal: React.FC<TokenCountModalProps> = (props) => {
  const { t } = useI18n();
  const { isOpen, onClose, availableModels } = props;

  const {
    text,
    setText,
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
    setTokenCount,
  } = useTokenCountLogic(props);

  const displayModelName = availableModels.find((m) => m.id === selectedModelId)?.name || selectedModelId;

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
        <button onClick={onClose} className={MODAL_CLOSE_BUTTON_CLASS}>
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
            dropdownClassName="w-full max-h-60"
            renderTrigger={({ isOpen, setIsOpen, selectedModel }) => (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg text-sm text-[var(--theme-text-primary)] hover:border-[var(--theme-border-focus)] transition-colors focus:ring-2 focus:ring-[var(--theme-border-focus)] outline-none"
              >
                <div className="flex items-start gap-2.5 min-w-0 text-left">
                  <div className="mt-0.5 flex-shrink-0">{getModelIcon(selectedModel)}</div>
                  <div className="min-w-0">
                    <div className="truncate">{displayModelName}</div>
                    <div className="text-xs text-[var(--theme-text-tertiary)] font-mono truncate">
                      {selectedModelId}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`flex-shrink-0 text-[var(--theme-text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  strokeWidth={1.75}
                />
              </button>
            )}
          />
        </div>

        <TokenCountInput
          text={text}
          onChange={(newText) => {
            setText(newText);
            setTokenCount(null);
          }}
        />

        <TokenCountFiles
          files={files}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onRemoveFile={removeFile}
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
      />
    </Modal>
  );
};
