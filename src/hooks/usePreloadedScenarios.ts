import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { ChatMessage, SavedScenario, SavedChatSession, AppSettings } from '../types';
import { logService } from '../services/logService';
import { generateUniqueId } from '../utils/chat/ids';
import { generateSessionTitle, createNewSession } from '../utils/chat/session';
import { DEFAULT_CHAT_SETTINGS, DEFAULT_SYSTEM_INSTRUCTION } from '../constants/appConstants';
import { dbService } from '../utils/db';
import {
  buildSavedScenarios,
  getExportableUserScenarios,
  initializeScenarioState,
} from '../features/scenarios/scenarioLibrary';

type SessionsUpdater = (
  updater: (prev: SavedChatSession[]) => SavedChatSession[],
  options?: { persist?: boolean },
) => void | Promise<void>;

interface PreloadedScenariosProps {
  appSettings: AppSettings;
  setAppSettings: Dispatch<SetStateAction<AppSettings>>;
  updateAndPersistSessions: SessionsUpdater;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
}

export const usePreloadedScenarios = ({
  appSettings,
  setAppSettings,
  updateAndPersistSessions,
  setActiveSessionId,
}: PreloadedScenariosProps) => {
  const [userSavedScenarios, setUserSavedScenarios] = useState<SavedScenario[]>([]);
  const savedScenarios = buildSavedScenarios(userSavedScenarios);

  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const storedScenarios = await dbService.getAllScenarios();
        const { userScenarios, didChange } = initializeScenarioState(storedScenarios, localStorage);

        // Save if any changes were made
        if (didChange) {
          await dbService.setAllScenarios(userScenarios);
        }

        setUserSavedScenarios(userScenarios);
      } catch (error) {
        logService.error('Error loading preloaded scenarios:', { error });
      }
    };
    loadScenarios();
  }, []);

  const handleSaveAllScenarios = (updatedScenarios: SavedScenario[]) => {
    const scenariosToSave = getExportableUserScenarios(updatedScenarios);
    setUserSavedScenarios(scenariosToSave);
    dbService.setAllScenarios(scenariosToSave).catch((error) => {
      logService.error('Failed to save scenarios to DB', { error });
    });
  };

  const handleLoadPreloadedScenario = (scenarioToLoad: SavedScenario) => {
    const messages: ChatMessage[] = scenarioToLoad.messages.map((pm) => ({
      ...pm,
      id: generateUniqueId(),
      timestamp: new Date(),
    }));

    const systemInstruction = scenarioToLoad.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION;

    // Create a new session from scratch with the scenario's data
    const sessionSettings = {
      ...DEFAULT_CHAT_SETTINGS, // Start with defaults
      ...appSettings, // Layer on current app settings
      systemInstruction, // Override with scenario's system instruction
    };

    const title = scenarioToLoad.title || generateSessionTitle(messages) || 'New Chat';

    const newSession = createNewSession(sessionSettings, messages, title);

    updateAndPersistSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);
    setActiveSessionId(newSession.id);
    dbService.setActiveSessionId(newSession.id);

    // Also update the global/default system prompt in app settings
    setAppSettings((prev) => ({
      ...prev,
      systemInstruction,
    }));
  };

  return {
    savedScenarios,
    handleSaveAllScenarios,
    handleLoadPreloadedScenario,
  };
};
