
import { useState, useEffect, useRef, useCallback } from 'react';
import { SavedScenario } from '../types';
import { translations } from '../utils/appUtils';
import { generateUniqueId } from '../utils/appUtils';
import { triggerDownload, sanitizeFilename } from '../utils/exportUtils';

export type ModalView = 'list' | 'editor';

const SYSTEM_SCENARIO_IDS = ['fop-scenario-default', 'unrestricted-scenario-default', 'pyrite-scenario-default', 'succinct-scenario-default'];

interface UseScenarioManagerProps {
  isOpen: boolean;
  savedScenarios: SavedScenario[];
  onSaveAllScenarios: (scenarios: SavedScenario[]) => void;
  onClose: () => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const useScenarioManager = ({
  isOpen,
  savedScenarios,
  onSaveAllScenarios,
  onClose,
  t
}: UseScenarioManagerProps) => {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(savedScenarios);
  const [view, setView] = useState<ModalView>('list');
  const [editingScenario, setEditingScenario] = useState<SavedScenario | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  const importInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScenarios(savedScenarios);
      setView('list');
      setEditingScenario(null);
      setFeedback(null);
      setSearchQuery('');
    }
  }, [isOpen, savedScenarios]);

  const showFeedback = useCallback((type: 'success' | 'error' | 'info', message: string, duration: number = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), duration);
  }, []);

  const handleStartAddNew = useCallback(() => {
    setEditingScenario({ id: Date.now().toString(), title: '', messages: [] });
    setView('editor');
  }, []);

  const handleStartEdit = useCallback((scenario: SavedScenario) => {
    setEditingScenario(scenario);
    setView('editor');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingScenario(null);
    setView('list');
  }, []);

  const handleSaveScenario = useCallback((scenarioToSave: SavedScenario) => {
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
  }, [showFeedback, t]);

  const handleDeleteScenario = useCallback((id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
    showFeedback('info', t('scenarios_feedback_cleared', 'Scenario deleted.'));
  }, [showFeedback, t]);

  const handleSaveAllAndClose = useCallback(() => {
    onSaveAllScenarios(scenarios);
    onClose();
  }, [onSaveAllScenarios, scenarios, onClose]);

  const handleExportScenarios = useCallback(() => {
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
  }, [scenarios, showFeedback, t]);

  const handleExportSingleScenario = useCallback((scenario: SavedScenario) => {
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
  }, [showFeedback, t]);

  const handleImportScenarios = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [showFeedback, t]);

  return {
    scenarios,
    view,
    editingScenario,
    searchQuery,
    setSearchQuery,
    feedback,
    importInputRef,
    systemScenarioIds: SYSTEM_SCENARIO_IDS,
    showFeedback,
    actions: {
      handleStartAddNew,
      handleStartEdit,
      handleCancelEdit,
      handleSaveScenario,
      handleDeleteScenario,
      handleSaveAllAndClose,
      handleExportScenarios,
      handleExportSingleScenario,
      handleImportScenarios,
    }
  };
};
