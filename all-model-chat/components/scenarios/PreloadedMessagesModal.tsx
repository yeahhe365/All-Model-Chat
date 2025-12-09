
import React, { useRef, useEffect } from 'react';
import { SavedScenario } from '../../types';
import { X, Plus, Upload, Download, ArrowLeft } from 'lucide-react';
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

  const handleClose = () => { 
      if (isOpen) {
          actions.handleSaveAllAndClose(); 
      }
  };

  const handleLoadAndClose = (scenario: SavedScenario) => {
    if (scenario.messages.length === 0 && (!scenario.systemInstruction || !scenario.systemInstruction.trim())) {
      showFeedback('error', t('scenarios_feedback_empty'));
      return;
    }
    onLoadScenario(scenario);
    showFeedback('success', t('scenarios_feedback_loaded'));
    setTimeout(handleClose, 300);
  };

  if (!isOpen) return null;

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={handleClose} 
        noPadding 
        contentClassName="w-full h-full sm:w-[95vw] sm:h-[90vh] sm:max-w-7xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] transition-all"
    >
      <div className="flex flex-col h-full relative">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-4 sm:py-5 bg-[var(--theme-bg-primary)] flex-shrink-0 z-10 border-b border-[var(--theme-border-secondary)]/50">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {view === 'editor' && (
                <button 
                    onClick={actions.handleCancelEdit}
                    className="p-1.5 -ml-2 text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-colors md:hidden"
                >
                    <ArrowLeft size={20} />
                </button>
            )}
            <h2 id="scenarios-title" className="text-xl sm:text-2xl font-bold text-[var(--theme-text-primary)] tracking-tight truncate">
                {view === 'editor' ? (editingScenario?.title || t('scenarios_title_create')) : t('scenarios_title')}
            </h2>
            {view === 'editor' && (
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[var(--theme-bg-accent)]/10 text-xs font-semibold text-[var(--theme-text-accent)] border border-[var(--theme-bg-accent)]/20 uppercase tracking-wide">
                    Editor
                </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
             {view === 'list' && (
                 <>
                    <button 
                        onClick={actions.handleStartAddNew} 
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-xl transition-colors flex items-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        <span className="hidden sm:inline">{t('scenarios_create_button')}</span>
                        <span className="sm:hidden">{t('add')}</span>
                    </button>
                    
                    <div className="hidden sm:block h-6 w-px bg-[var(--theme-border-secondary)] mx-1"></div>
                    
                    <button 
                        onClick={() => importInputRef.current?.click()} 
                        className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-xl transition-colors hidden sm:block"
                        title={t('import')}
                    >
                        <Upload size={20} />
                    </button>
                    <input type="file" ref={importInputRef} onChange={actions.handleImportScenarios} accept=".json" className="hidden" />
                    
                    <button 
                        onClick={actions.handleExportScenarios}
                        className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-xl transition-colors hidden sm:block"
                        title={t('export')}
                    >
                        <Download size={20} />
                    </button>
                 </>
             )}
             
             <div className="h-6 w-px bg-[var(--theme-border-secondary)] mx-1"></div>
             
             <button 
                ref={closeButtonRef} 
                onClick={handleClose} 
                className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-danger)]/10 hover:text-[var(--theme-text-danger)] rounded-xl transition-colors" 
                aria-label={t('scenarios_close_aria')}
            >
                <X size={22} />
            </button>
          </div>
        </div>

        {/* Feedback Toast */}
        {feedback && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
              <div className={`px-5 py-2.5 rounded-full text-sm font-semibold shadow-xl backdrop-blur-md border flex items-center gap-2.5
                ${feedback.type === 'success' ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400' : ''}
                ${feedback.type === 'error' ? 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400' : ''}
                ${feedback.type === 'info' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400' : ''}
              `}>
                {feedback.message}
              </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-grow flex flex-col min-h-0 bg-[var(--theme-bg-secondary)] p-3 sm:p-4 md:p-8 overflow-hidden">
            {view === 'list' ? (
                <ScenarioList 
                    scenarios={scenarios}
                    systemScenarioIds={systemScenarioIds}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onLoad={handleLoadAndClose}
                    onEdit={actions.handleStartEdit}
                    onDelete={actions.handleDeleteScenario}
                    onDuplicate={actions.handleDuplicateScenario}
                    onExport={actions.handleExportSingleScenario}
                    onView={actions.handleStartEdit}
                    t={t}
                />
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
