import React, { useState, useEffect, useRef } from 'react';
import { SavedScenario, PreloadedMessage } from '../types';
import { X, Plus, Trash2, Edit3, UploadCloud, Download, AlertTriangle, CheckCircle, Loader2, MessageSquare, Play, Save, ChevronRight } from 'lucide-react';
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
  const actionIconSize = getResponsiveValue(16, 18);

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
      showFeedback('success', t('scenarios_feedback_saved'));
      handleCancelEdit();
  };
  
  const handleDeleteScenario = (id: string) => {
      setScenarios(prev => prev.filter(s => s.id !== id));
      showFeedback('info', t('scenarios_feedback_cleared', 'Scenario deleted.'));
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
      <div className="flex-grow overflow-y-auto custom-scrollbar p-1">
          {scenarios.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[var(--theme-text-tertiary)] border-2 border-dashed border-[var(--theme-border-secondary)] rounded-xl bg-[var(--theme-bg-primary)]/50">
                  <MessageSquare size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">{t('scenarios_empty_list')}</p>
                  <button 
                    onClick={handleStartAddNew}
                    className="mt-4 px-4 py-2 text-sm font-medium text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-input)] rounded-md transition-colors"
                  >
                    {t('scenarios_create_first', 'Create your first scenario')}
                  </button>
              </div>
          ) : (
            <ul className="space-y-2">
              {scenarios.map(scenario => (
                <li key={scenario.id} className="group flex items-center justify-between p-3 bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-focus)] rounded-xl transition-all duration-200 shadow-sm">
                  <div 
                    className="flex-grow min-w-0 cursor-pointer"
                    onClick={() => handleLoadAndClose(scenario)}
                  >
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--theme-text-primary)] truncate text-base">{scenario.title}</p>
                        {scenario.id === 'fop-scenario-default' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] rounded-md">System</span>
                        )}
                      </div>
                      <p className="text-[var(--theme-text-tertiary)] text-xs mt-0.5 flex items-center gap-2">
                          <span>
                            {scenario.messages.length} {language === 'zh' ? '条消息' : `message${scenario.messages.length !== 1 ? 's' : ''}`}
                          </span>
                          {scenario.systemInstruction && <span className="w-1 h-1 rounded-full bg-[var(--theme-text-tertiary)]"></span>}
                          {scenario.systemInstruction && <span>{t('scenarios_has_system_prompt', 'Has System Prompt')}</span>}
                      </p>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLoadAndClose(scenario); }} 
                        className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-success)] hover:bg-[var(--theme-bg-success)] rounded-lg transition-colors" 
                        title={t('scenarios_load_title')}
                      >
                          <Play size={actionIconSize} strokeWidth={1.5} />
                      </button>
                      
                      <div className="w-px h-4 bg-[var(--theme-border-secondary)] mx-1"></div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(scenario); }} 
                        disabled={scenario.id === 'fop-scenario-default'} 
                        className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg disabled:opacity-20 disabled:cursor-not-allowed transition-colors" 
                        title={t('scenarios_edit_title')}
                      >
                          <Edit3 size={actionIconSize} strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteScenario(scenario.id); }} 
                        disabled={scenario.id === 'fop-scenario-default'} 
                        className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed transition-colors" 
                        title={t('scenarios_delete_title')}
                      >
                          <Trash2 size={actionIconSize} strokeWidth={1.5} />
                      </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>
      
      {/* Consolidated Footer */}
      <div className="mt-auto pt-4 border-t border-[var(--theme-border-primary)] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--theme-bg-tertiary)] -mx-3 -mb-3 sm:-mx-5 sm:-mb-5 md:-mx-6 md:-mb-6 p-3 sm:p-5 md:p-6 rounded-b-xl">
            <button 
                onClick={handleStartAddNew} 
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)] rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow"
            >
                <Plus size={18} /> {t('scenarios_create_button', 'Add New Scenario')}
            </button>
            
            <button 
                onClick={handleSaveAllAndClose} 
                type="button" 
                className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-[var(--theme-border-focus)]" 
                title={t('scenarios_save_title')}
            >
                <Save size={18} /> {t('scenarios_save_and_close', 'Save & Close')}
            </button>
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

  // Helper for rudimentary locale detection for the message count
  const language = t('scenarios_create_button') === '添加新场景' ? 'zh' : 'en';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} noPadding contentClassName="w-full h-full sm:w-auto sm:h-auto">
      <div 
        className="bg-[var(--theme-bg-tertiary)] p-3 sm:p-5 md:p-6 w-full h-full sm:rounded-xl sm:shadow-premium sm:w-[52rem] sm:h-[42rem] flex flex-col transition-all duration-300"
      >
        <div className="flex justify-between items-center mb-4 sm:mb-5 flex-shrink-0">
          <h2 id="scenarios-title" className="text-xl font-bold text-[var(--theme-text-primary)] flex items-center gap-2.5">
            <div className="p-2 bg-[var(--theme-bg-input)] rounded-lg border border-[var(--theme-border-secondary)] shadow-sm">
                <MessageSquare size={headingIconSize} className="text-[var(--theme-text-link)]" />
            </div>
            {view === 'editor' ? (editingScenario?.title ? t('scenarios_title_edit', `Editing Scenario`) : t('scenarios_title_create', `Create New Scenario`)) : t('scenarios_title')}
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

        {feedback && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium flex items-center shadow-sm animate-in fade-in slide-in-from-top-2
            ${feedback.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : ''}
            ${feedback.type === 'error' ? 'bg-red-500/10 text-red-600 border border-red-500/20' : ''}
            ${feedback.type === 'info' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : ''}
          `}>
            {feedback.type === 'success' && <CheckCircle size={18} className="mr-2" />}
            {feedback.type === 'error' && <AlertTriangle size={18} className="mr-2" />}
            {feedback.message}
          </div>
        )}

        <div className="flex-grow flex flex-col min-h-0 relative">
            {view === 'list' ? renderListView() : renderEditorView()}
        </div>
      </div>
    </Modal>
  );
};