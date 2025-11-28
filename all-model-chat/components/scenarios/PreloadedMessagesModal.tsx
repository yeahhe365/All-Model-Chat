
import React, { useRef, useEffect } from 'react';
import { SavedScenario } from '../../types';
import { X, Plus, Save, Upload, Download } from 'lucide-react';
import { translations } from '../../utils/appUtils';
import { Modal } from '../shared/Modal';
import { ScenarioEditor } from './ScenarioEditor';
import { ScenarioList } from './ScenarioList';
import { useScenarioManager } from '../../hooks/useScenarioManager';

interface PreloadedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedScenarios: SavedScenario[];
  onSaveAllScenarios: (scenarios: SavedScenario[]) => void;
  onLoadScenario: (scenario: SavedScenario) => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const PreloadedMessagesModal: React.FC<PreloadedMessagesModalProps> = ({
  isOpen,
  onClose,
  savedScenarios,
  onSaveAllScenarios,
  onLoadScenario,
  t
}) => {
  const {
    scenarios,
    view,
    editingScenario,
    searchQuery,
    setSearchQuery,
    feedback,
    importInputRef,
    systemScenarioIds,
    showFeedback,
    actions
  } = useScenarioManager({
    isOpen,
    savedScenarios,
    onSaveAllScenarios,
    onClose,
    t
  });

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => { if (isOpen) onClose(); };

  const handleLoadAndClose = (scenario: SavedScenario) => {
    if (scenario.messages.length === 0 && (!scenario.systemInstruction || !scenario.systemInstruction.trim())) {
      showFeedback('error', t('scenarios_feedback_empty'));
      return;
    }
    onLoadScenario(scenario);
    showFeedback('success', t('scenarios_feedback_loaded'));
    setTimeout(handleClose, 300);
  };

  const renderFooter = () => (
    <div className="mt-auto pt-4 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-tertiary)]">
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            
            {/* Left Group: Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                <button 
                    onClick={actions.handleStartAddNew} 
                    className="px-4 py-2.5 text-sm font-medium bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)] rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                    <Plus size={16} /> {t('scenarios_create_button', 'Add')}
                </button>
                
                <div className="h-6 w-px bg-[var(--theme-border-secondary)] mx-1 hidden sm:block"></div>
                
                <button 
                    onClick={() => importInputRef.current?.click()} 
                    className="p-2.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] rounded-xl transition-colors border border-transparent hover:border-[var(--theme-border-secondary)]"
                    title={t('scenarios_import_button', 'Import')}
                >
                    <Upload size={18} strokeWidth={1.5} />
                </button>
                <input type="file" ref={importInputRef} onChange={actions.handleImportScenarios} accept=".json" className="hidden" />
                
                <button 
                    onClick={actions.handleExportScenarios}
                    className="p-2.5 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] rounded-xl transition-colors border border-transparent hover:border-[var(--theme-border-secondary)]"
                    title={t('scenarios_export_button', 'Export')}
                >
                    <Download size={18} strokeWidth={1.5} />
                </button>
            </div>
            
            {/* Right Group: Close/Save */}
            <div className="flex gap-3 w-full sm:w-auto">
                <button 
                    onClick={handleClose} 
                    className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] rounded-xl transition-colors"
                >
                    {t('cancel', 'Cancel')}
                </button>
                <button 
                    onClick={actions.handleSaveAllAndClose} 
                    className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg" 
                >
                    <Save size={16} /> {t('scenarios_save_and_close', 'Save')}
                </button>
            </div>
        </div>
    </div>
  );
  
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} noPadding contentClassName="w-full h-full sm:w-auto sm:h-auto">
      <div 
        className="bg-[var(--theme-bg-tertiary)] p-4 sm:p-6 w-full h-full sm:rounded-2xl sm:shadow-2xl sm:w-[42rem] sm:h-[80vh] max-h-[800px] flex flex-col transition-all duration-300"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-2 flex-shrink-0">
          <h2 id="scenarios-title" className="text-xl font-bold text-[var(--theme-text-primary)] flex items-center gap-2.5">
            {view === 'editor' ? (
                <>
                    <span className="text-[var(--theme-text-tertiary)]">{t('scenarios_title')}</span>
                    <span className="text-[var(--theme-text-tertiary)]">/</span>
                    <span>{editingScenario?.title ? 'Edit' : 'New'}</span>
                </>
            ) : (
                t('scenarios_title')
            )}
          </h2>
          <button 
            ref={closeButtonRef} 
            onClick={handleClose} 
            className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] rounded-full transition-colors" 
            aria-label={t('scenarios_close_aria')}
          >
            <X size={24} />
          </button>
        </div>

        {/* Feedback Toast */}
        {feedback && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-center shadow-sm animate-in fade-in slide-in-from-top-2
            ${feedback.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : ''}
            ${feedback.type === 'error' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : ''}
            ${feedback.type === 'info' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : ''}
          `}>
            <div className={`mr-2 w-2 h-2 rounded-full ${feedback.type === 'success' ? 'bg-green-500' : feedback.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
            {feedback.message}
          </div>
        )}

        {/* Content View Switcher */}
        <div className="flex-grow flex flex-col min-h-0 relative">
            {view === 'list' ? (
                <>
                    <ScenarioList 
                        scenarios={scenarios}
                        systemScenarioIds={systemScenarioIds}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        onLoad={handleLoadAndClose}
                        onEdit={actions.handleStartEdit}
                        onDelete={actions.handleDeleteScenario}
                        onExport={actions.handleExportSingleScenario}
                        t={t}
                    />
                    {renderFooter()}
                </>
            ) : (
                <ScenarioEditor 
                    initialScenario={editingScenario}
                    onSave={actions.handleSaveScenario}
                    onCancel={actions.handleCancelEdit}
                    t={t}
                />
            )}
        </div>
      </div>
    </Modal>
  );
};
