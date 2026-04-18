import { describe, expect, it, vi } from 'vitest';
import { reasonerScenario, voxelScenario } from '../../constants/defaultScenarios';
import {
  buildSavedScenarios,
  buildScenarioExportPayload,
  initializeScenarioState,
  mergeImportedScenarios,
  SYSTEM_SCENARIO_IDS,
} from './scenarioLibrary';

const createStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
};

describe('scenarioLibrary', () => {
  it('prunes reserved scenarios from storage and seeds missing built-in user presets', () => {
    const storage = createStorage({
      hasSeededJailbreaks_v1: 'true',
      hasSeededAnna_v1: 'true',
      hasSeededEniManualPaste_v1: 'true',
    });

    const result = initializeScenarioState(
      [
        reasonerScenario,
        {
          id: 'cyberpunk-rpg-scenario',
          title: 'Deprecated preset',
          messages: [],
        },
      ],
      storage,
    );

    expect(result.didChange).toBe(true);
    expect(result.userScenarios).toEqual([voxelScenario]);
    expect(result.savedScenarios.map((scenario) => scenario.id)).toEqual([
      ...SYSTEM_SCENARIO_IDS,
      voxelScenario.id,
    ]);
    expect(storage.setItem).toHaveBeenCalledWith('hasSeededPlayablePresets_v1', 'true');
  });

  it('exports only user scenarios', () => {
    const payload = buildScenarioExportPayload(
      buildSavedScenarios([
        voxelScenario,
        {
          id: 'custom-scenario',
          title: 'Custom Scenario',
          messages: [],
        },
      ]),
    );

    expect(payload).toEqual({
      type: 'AllModelChat-Scenarios',
      version: 1,
      scenarios: [
        voxelScenario,
        {
          id: 'custom-scenario',
          title: 'Custom Scenario',
          messages: [],
        },
      ],
    });
  });

  it('merges imports by skipping duplicate content and regenerating colliding ids', () => {
    const merged = mergeImportedScenarios({
      existingScenarios: [
        {
          id: 'existing-scenario',
          title: 'Custom Scenario',
          messages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
        },
      ],
      importedScenarios: [
        {
          id: 'duplicate-content',
          title: 'Custom Scenario',
          messages: [{ id: 'msg-2', role: 'user', content: 'Hello' }],
        },
        {
          id: 'existing-scenario',
          title: 'Imported Scenario',
          messages: [{ id: 'msg-3', role: 'model', content: 'Hi there' }],
        },
        reasonerScenario,
      ],
      createId: () => 'generated-scenario-id',
    });

    expect(merged).toEqual([
      {
        id: 'existing-scenario',
        title: 'Custom Scenario',
        messages: [{ id: 'msg-1', role: 'user', content: 'Hello' }],
      },
      {
        id: 'generated-scenario-id',
        title: 'Imported Scenario',
        messages: [{ id: 'msg-3', role: 'model', content: 'Hi there' }],
      },
    ]);
  });
});
