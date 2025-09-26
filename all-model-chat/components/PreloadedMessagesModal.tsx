import React, { useState, useEffect, useRef } from 'react';
import { SavedScenario, PreloadedMessage } from '../types';
import { X, PlusCircle, Trash2, Edit3, UploadCloud, Download, AlertTriangle, CheckCircle, Loader2, MessageSquare, Play, Save } from 'lucide-react';
import { translations, getResponsiveValue } from '../utils/appUtils';
import { Modal } from './shared/Modal';
import { ScenarioEditor } from './ScenarioEditor';

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
  type ModalView = 'list' | 'editor';
  
  const [scenarios, setScenarios] = useState<SavedScenario[]>(savedScenarios);
  const [view, setView] = useState<ModalView>('list');
  const [editingScenario, setEditingScenario] = useState<SavedScenario | null>(null);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const headingIconSize = getResponsiveValue(20, 24);
  const actionIconSize = getResponsiveValue(14, 16);

  useEffect(() => {
    if (isOpen) {
      setScenarios(savedScenarios);
      setView('list');
      setEditingScenario(null);
      setFeedback(null);
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, savedScenarios]);

  if (!isOpen) return null;

  const handleClose = () => { if (isOpen) onClose(); };

  const showFeedback = (type: 'success' | 'error' | 'info', message: string, duration: number = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), duration);
  };
  
  const handleSaveAllAndClose = () => {
    onSaveAllScenarios(scenarios);
    handleClose();
  };

  const handleStartAddNew = () => {
    setEditingScenario({ id: Date.now().toString(), title: '', messages: [] });
    setView('editor');
  };

  const handleStartEdit = (scenario: SavedScenario) => {
    setEditingScenario(scenario);
    setView('editor');
  };
  
  const handleCancelEdit = () => {
    setEditingScenario(null);
    setView('list');
  }

  const handleSaveScenario = (scenarioToSave: SavedScenario) => {
      if (!scenarioToSave.title.trim()) {
        showFeedback('error', 'Scenario title cannot be empty.');
        return;
      }
      setScenarios(prev => {
          const existing = prev.find(s => s.id === scenarioToSave.id);
          if (existing) {
              return prev.map(s => s.id === scenarioToSave.id ? scenarioToSave : s);
          }
          return [...prev, scenarioToSave];
      });
      showFeedback('success', 'Scenario saved.');
      handleCancelEdit();
  };
  
  const handleDeleteScenario = (id: string) => {
      setScenarios(prev => prev.filter(s => s.id !== id));
      showFeedback('info', 'Scenario deleted.');
  };

  const handleLoadAndClose = (scenario: SavedScenario) => {
    if (scenario.messages.length === 0 && (!scenario.systemInstruction || !scenario.systemInstruction.trim())) {
      showFeedback('error', t('scenarios_feedback_empty'));
      return;
    }
    onLoadScenario(scenario);
    showFeedback('success', t('scenarios_feedback_loaded'));
    setTimeout(handleClose, 700);
  };
  
  const renderListView = () => (
    <>
      <div className="flex-grow overflow-y-auto custom-scrollbar pr-0.5 -mr-0.5">
          {scenarios.length === 0 ? (
              <p className="text-xs sm:text-sm text-[var(--theme-text-tertiary)] text-center py-6">{t('scenarios_empty_list')}</p>
          ) : (
            <ul className="space-y-2">
              {scenarios.map(scenario => (
                <li key={scenario.id} className="p-2 sm:p-2.5 bg-[var(--theme-bg-input)] rounded-md border border-[var(--theme-border-secondary)] flex items-center gap-2 text-xs sm:text-sm">
                  <div className="flex-grow min-w-0">
                      <p className="font-semibold text-[var(--theme-text-primary)] truncate" title={scenario.title}>{scenario.title}</p>
                      <p className="text-[var(--theme-text-tertiary)] text-xs">{scenario.messages.length} message(s)</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 ml-1">
                      <button onClick={() => handleLoadAndClose(scenario)} className="p-1 sm:p-1.5 text-[var(--theme-text-tertiary)] hover:text-green-500" title="Load Scenario"><Play size={actionIconSize} /></button>
                      <button onClick={() => handleStartEdit(scenario)} disabled={scenario.id === 'fop-scenario-default'} className="p-1 sm:p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] disabled:opacity-30 disabled:cursor-not-allowed" title={t('scenarios_edit_title')}><Edit3 size={actionIconSize-2} /></button>
                      <button onClick={() => handleDeleteScenario(scenario.id)} disabled={scenario.id === 'fop-scenario-default'} className="p-1 sm:p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] disabled:opacity-30 disabled:cursor-not-allowed" title={t('scenarios_delete_title')}><Trash2 size={actionIconSize-2} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>
       <div className="mt-auto pt-3 sm:pt-4 border-t border-[var(--theme-border-primary)] space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-start gap-2 sm:gap-3">
                <button onClick={handleStartAddNew} className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-border-primary)] text-[var(--theme-text-primary)] rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-1.5">
                    <PlusCircle size={actionIconSize} /> Add New Scenario
                </button>
            </div>
             <div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-[var(--theme-border-secondary)]">
                <button onClick={handleSaveAllAndClose} type="button" className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-md transition-colors flex items-center justify-center gap-1 sm:gap-1.5" title={t('scenarios_save_title')}>
                    <Save size={actionIconSize} /> Save & Close
                </button>
            </div>
      </div>
    </>
  );
  
  const renderEditorView = () => (
      <ScenarioEditor 
          initialScenario={editingScenario}
          onSave={handleSaveScenario}
          onCancel={handleCancelEdit}
          t={t}
      />
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} noPadding contentClassName="w-full h-full sm:w-auto sm:h-auto">
      <div 
        className="bg-[var(--theme-bg-tertiary)] p-3 sm:p-5 md:p-6 w-full h-full sm:rounded-xl sm:shadow-premium sm:w-[50rem] sm:h-[38rem] flex flex-col"
        style={{ transition: 'all 0.3s' }}
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 id="scenarios-title" className="text-lg sm:text-xl font-semibold text-[var(--theme-text-link)] flex items-center">
            <MessageSquare size={headingIconSize} className="mr-2 opacity-80" />
            {view === 'editor' ? (editingScenario?.title ? t('scenarios_title_edit', `Editing Scenario`) : t('scenarios_title_create', `Create New Scenario`)) : t('scenarios_title')}
          </h2>
          <button ref={closeButtonRef} onClick={handleClose} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors" aria-label={t('scenarios_close_aria')}>
            <X size={20} />
          </button>
        </div>

        {feedback && (
          <div className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded-md text-xs sm:text-sm flex items-center
            ${feedback.type === 'success' ? 'bg-[var(--theme-bg-success)] text-[var(--theme-text-success)]' : ''}
            ${feedback.type === 'error' ? 'bg-[var(--theme-bg-danger)] text-[var(--theme-text-danger)]' : ''}
            ${feedback.type === 'info' ? 'bg-[var(--theme-bg-info)] text-[var(--theme-text-info)]' : ''}
          `}>
            {feedback.type === 'success' && <CheckCircle size={actionIconSize} className="mr-1.5 sm:mr-2" />}
            {feedback.type === 'error' && <AlertTriangle size={actionIconSize} className="mr-1.5 sm:mr-2" />}
            {feedback.message}
          </div>
        )}

        <div className="flex-grow flex flex-col min-h-0">
            {view === 'list' ? renderListView() : renderEditorView()}
        </div>
      </div>
    </Modal>
  );
};