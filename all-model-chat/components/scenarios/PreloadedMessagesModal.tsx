
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SavedScenario } from '../../types';
import { X, Plus, Trash2, Edit3, Search, Play, Save, MessageSquare, Shield, User, Bot, Upload, Download } from 'lucide-react';
import { translations, generateUniqueId } from '../../utils/appUtils';
import { Modal } from '../shared/Modal';
import { ScenarioEditor } from './ScenarioEditor';
import { useResponsiveValue } from '../../hooks/useDevice';
import { triggerDownload, sanitizeFilename } from '../../utils/exportUtils';

interface PreloadedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedScenarios: SavedScenario[];
  onSaveAllScenarios: (scenarios: SavedScenario[]) => void;
  onLoadScenario: (scenario: SavedScenario) => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

const SYSTEM_SCENARIO_IDS = ['fop-scenario-default', 'unrestricted-scenario-default', 'pyrite-scenario-default'];

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
  const [searchQuery, setSearchQuery] = useState('');
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const headingIconSize = useResponsiveValue(20, 24);

  useEffect(() => {
    if (isOpen) {
      setScenarios(savedScenarios);
      setView('list');
      setEditingScenario(null);
      setFeedback(null);
      setSearchQuery('');
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, savedScenarios]);

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
      setView('list');
      setEditingScenario(null);
  };
  
  const handleDeleteScenario = (id: string) => {
      setScenarios(prev => prev.filter(s => s.id !== id));
      showFeedback('info', t('scenarios_feedback_cleared', 'Scenario deleted.'));
  };

  const handleExportScenarios = () => {
      // Only export user scenarios, excluding system ones
      const scenariosToExport = scenarios.filter(s => !SYSTEM_SCENARIO_IDS.includes(s.id));
      
      if (scenariosToExport.length === 0) {
          showFeedback('info', t('scenarios_feedback_emptyExport'));
          return;
      }

      const dataToExport = { 
          type: 'AllModelChat-Scenarios', 
          version: 1, 
          scenarios: scenariosToExport 
      };
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const date = new Date().toISOString().slice(0, 10);
      triggerDownload(URL.createObjectURL(blob), `scenarios-export-${date}.json`);
      showFeedback('success', t('scenarios_feedback_exported'));
  };

  const handleExportSingleScenario = (scenario: SavedScenario) => {
      const dataToExport = {
          type: 'AllModelChat-Scenarios',
          version: 1,
          scenarios: [scenario]
      };
      const safeTitle = sanitizeFilename(scenario.title);
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      triggerDownload(URL.createObjectURL(blob), `scenario-${safeTitle}.json`);
      showFeedback('success', t('scenarios_feedback_exported'));
  };

  const handleImportScenarios = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const text = event.target?.result as string;
              const data = JSON.parse(text);
              
              if (data && data.type === 'AllModelChat-Scenarios' && Array.isArray(data.scenarios)) {
                  const importedScenarios = data.scenarios as SavedScenario[];
                  // Re-generate IDs to avoid collision
                  const sanitizedImport = importedScenarios.map(s => ({
                      ...s,
                      id: generateUniqueId()
                  }));
                  
                  setScenarios(prev => [...prev, ...sanitizedImport]);
                  showFeedback('success', t('scenarios_feedback_imported'));
              } else {
                  throw new Error("Invalid format");
              }
          } catch (error) {
              console.error("Import failed", error);
              showFeedback('error', t('scenarios_feedback_importFailed'));
          } finally {
              if (importInputRef.current) importInputRef.current.value = '';
          }
      };
      reader.readAsText(file);
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

  const filteredScenarios = useMemo(() => {
      if (!searchQuery.trim()) return scenarios;
      const lowerQuery = searchQuery.toLowerCase();
      return scenarios.filter(s => 
          s.title.toLowerCase().includes(lowerQuery) || 
          s.messages.some(m => m.content.toLowerCase().includes(lowerQuery))
      );
  }, [scenarios, searchQuery]);

  const systemScenarios = filteredScenarios.filter(s => SYSTEM_SCENARIO_IDS.includes(s.id));
  const userScenarios = filteredScenarios.filter(s => !SYSTEM_SCENARIO_IDS.includes(s.id));
  
  const renderScenarioItem = (scenario: SavedScenario, isSystem: boolean) => (
    <div 
        key={scenario.id} 
        className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-focus)] rounded-xl transition-all duration-200 cursor-pointer"
        onClick={() => handleLoadAndClose(scenario)}
    >
        <div className="flex-grow min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
                {isSystem ? (
                    <Shield size={14} className="text-[var(--theme-bg-accent)] flex-shrink-0" strokeWidth={2.5} />
                ) : (
                    <MessageSquare size={14} className="text-[var(--theme-text-tertiary)] group-hover:text-[var(--theme-text-primary)] transition-colors flex-shrink-0" strokeWidth={2} />
                )}
                <h3 className="font-semibold text-[var(--theme-text-primary)] truncate text-sm sm:text-base">
                    {scenario.title}
                </h3>
            </div>
            <p className="text-[var(--theme-text-tertiary)] text-xs flex items-center gap-3">
                <span>{scenario.messages.length} msgs</span>
                {scenario.systemInstruction && (
                    <span className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-[var(--theme-text-tertiary)]"></span>
                        System Prompt
                    </span>
                )}
            </p>
        </div>
        
        <div className="flex items-center gap-2 mt-3 sm:mt-0 self-end sm:self-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity focus-within:opacity-100">
            <button 
                onClick={(e) => { e.stopPropagation(); handleLoadAndClose(scenario); }} 
                className="p-2 bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)] rounded-lg transition-colors shadow-sm" 
                title={t('scenarios_load_title')}
            >
                <Play size={14} strokeWidth={2} fill="currentColor" />
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); handleExportSingleScenario(scenario); }}
                className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                title={t('scenarios_export_single_title', 'Export scenario')}
            >
                <Download size={16} strokeWidth={1.5} />
            </button>
            
            {!isSystem && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(scenario); }} 
                        className="p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors" 
                        title={t('scenarios_edit_title')}
                    >
                        <Edit3 size={16} strokeWidth={1.5} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteScenario(scenario.id); }} 
                        className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 rounded-lg transition-colors" 
                        title={t('scenarios_delete_title')}
                    >
                        <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                </>
            )}
        </div>
    </div>
  );

  const renderListView = () => (
    <>
        {/* Search Bar */}
        <div className="sticky top-0 z-10 pb-4 bg-[var(--theme-bg-tertiary)]">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)]" size={16} />
                <input 
                    type="text" 
                    placeholder="Search scenarios..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-xl text-sm text-[var(--theme-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] transition-all"
                />
            </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-6 pr-1 pb-2">
            {filteredScenarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-[var(--theme-text-tertiary)]">
                    <Search size={32} className="mb-3 opacity-20" />
                    <p className="text-sm">No scenarios found.</p>
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="mt-2 text-[var(--theme-text-link)] hover:underline text-xs">Clear search</button>}
                </div>
            ) : (
                <>
                    {userScenarios.length > 0 && (
                        <div className="space-y-2">
                            {userScenarios.map(s => renderScenarioItem(s, false))}
                        </div>
                    )}
                    
                    {systemScenarios.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] px-1 mt-4 mb-2">System Presets</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {systemScenarios.map(s => renderScenarioItem(s, true))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
      
        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-tertiary)]">
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                
                {/* Left Group: Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                    <button 
                        onClick={handleStartAddNew} 
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
                    <input type="file" ref={importInputRef} onChange={handleImportScenarios} accept=".json" className="hidden" />
                    
                    <button 
                        onClick={handleExportScenarios}
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
                        onClick={handleSaveAllAndClose} 
                        className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg" 
                    >
                        <Save size={16} /> {t('scenarios_save_and_close', 'Save')}
                    </button>
                </div>
            </div>
        </div>
    </>
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
            {view === 'list' ? renderListView() : (
                <ScenarioEditor 
                    initialScenario={editingScenario}
                    onSave={handleSaveScenario}
                    onCancel={handleCancelEdit}
                    t={t}
                />
            )}
        </div>
      </div>
    </Modal>
  );
};
