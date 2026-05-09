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
    expect(result.savedScenarios.map((scenario) => scenario.id)).toEqual([...SYSTEM_SCENARIO_IDS, voxelScenario.id]);
    expect(storage.setItem).toHaveBeenCalledWith('hasSeededPlayablePresets_v1', 'true');
  });

  it('does not seed jailbreak or persona override presets by default', () => {
    const storage = createStorage();

    const result = initializeScenarioState([], storage);

    expect(result.userScenarios.map((scenario) => scenario.id)).toEqual([voxelScenario.id]);
    expect(result.savedScenarios.map((scenario) => scenario.id)).toEqual([...SYSTEM_SCENARIO_IDS, voxelScenario.id]);
    expect(storage.setItem).toHaveBeenCalledWith('hasSeededPlayablePresets_v1', 'true');
    expect(storage.setItem).not.toHaveBeenCalledWith('hasSeededJailbreaks_v1', expect.any(String));
    expect(storage.setItem).not.toHaveBeenCalledWith('hasSeededAnna_v1', expect.any(String));
    expect(storage.setItem).not.toHaveBeenCalledWith('hasSeededEniManualPaste_v1', expect.any(String));
  });

  it('prunes previously seeded jailbreak and persona override presets', () => {
    const result = initializeScenarioState(
      [
        { id: 'fop-scenario-default', title: 'FOP Mode', messages: [] },
        { id: 'unrestricted-scenario-default', title: 'Unrestricted Mode', messages: [] },
        { id: 'pyrite-scenario-default', title: 'Pyrite Mode', messages: [] },
        { id: 'anna-scenario-default', title: 'Anna (Girlfriend Mode)', messages: [] },
        { id: 'eni-manual-paste-scenario-2026-04-12', title: 'ENI', messages: [] },
        { id: 'custom-scenario', title: 'Custom Scenario', messages: [] },
      ],
      createStorage({ hasSeededPlayablePresets_v1: 'true' }),
    );

    expect(result.didChange).toBe(true);
    expect(result.userScenarios).toEqual([{ id: 'custom-scenario', title: 'Custom Scenario', messages: [] }]);
    expect(result.savedScenarios.map((scenario) => scenario.id)).toEqual([...SYSTEM_SCENARIO_IDS, 'custom-scenario']);
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
