import {
  annaScenario,
  eniManualPasteScenario,
  formalScenario,
  fopScenario,
  pyriteScenario,
  reasonerScenario,
  socraticScenario,
  succinctScenario,
  unrestrictedScenario,
  voxelScenario,
} from '../../constants/defaultScenarios';
import { SavedScenario } from '../../types';

type ScenarioSeedStorage = Pick<Storage, 'getItem' | 'setItem'>;

interface ScenarioImportPayload {
  type: 'AllModelChat-Scenarios';
  version: 1;
  scenarios: SavedScenario[];
}

interface UserScenarioSeed {
  flag: string;
  scenarios: SavedScenario[];
}

interface InitializeScenarioStateResult {
  userScenarios: SavedScenario[];
  savedScenarios: SavedScenario[];
  didChange: boolean;
}

const DEPRECATED_SCENARIO_IDS = ['cyberpunk-rpg-scenario'];

const SYSTEM_SCENARIOS: SavedScenario[] = [reasonerScenario, succinctScenario, socraticScenario, formalScenario];

const USER_SCENARIO_SEEDS: UserScenarioSeed[] = [
  {
    flag: 'hasSeededJailbreaks_v1',
    scenarios: [fopScenario, unrestrictedScenario, pyriteScenario],
  },
  {
    flag: 'hasSeededAnna_v1',
    scenarios: [annaScenario],
  },
  {
    flag: 'hasSeededEniManualPaste_v1',
    scenarios: [eniManualPasteScenario],
  },
  {
    flag: 'hasSeededPlayablePresets_v1',
    scenarios: [voxelScenario],
  },
];

export const SYSTEM_SCENARIO_IDS = SYSTEM_SCENARIOS.map((scenario) => scenario.id);

const RESERVED_SCENARIO_IDS = new Set([...SYSTEM_SCENARIO_IDS, ...DEPRECATED_SCENARIO_IDS]);

const getScenarioFingerprint = (scenario: SavedScenario): string =>
  JSON.stringify({
    title: scenario.title.trim(),
    systemInstruction: scenario.systemInstruction?.trim() ?? '',
    messages: scenario.messages.map(({ role, content }: { role: 'user' | 'model'; content: string }) => ({
      role,
      content,
    })),
  });

export const getExportableUserScenarios = (scenarios: SavedScenario[]): SavedScenario[] =>
  scenarios.filter((scenario) => !RESERVED_SCENARIO_IDS.has(scenario.id));

export const buildScenarioExportPayload = (scenarios: SavedScenario[]): ScenarioImportPayload => ({
  type: 'AllModelChat-Scenarios',
  version: 1,
  scenarios: getExportableUserScenarios(scenarios),
});

export const buildSavedScenarios = (userScenarios: SavedScenario[]): SavedScenario[] => [
  ...SYSTEM_SCENARIOS,
  ...getExportableUserScenarios(userScenarios),
];

export const initializeScenarioState = (
  storedScenarios: SavedScenario[],
  storage: ScenarioSeedStorage,
): InitializeScenarioStateResult => {
  let userScenarios = getExportableUserScenarios(storedScenarios);
  let didChange = userScenarios.length !== storedScenarios.length;

  for (const seed of USER_SCENARIO_SEEDS) {
    if (storage.getItem(seed.flag)) {
      continue;
    }

    const existingIds = new Set(userScenarios.map((scenario) => scenario.id));
    const newScenarios = seed.scenarios.filter((scenario) => !existingIds.has(scenario.id));

    if (newScenarios.length > 0) {
      userScenarios = [...userScenarios, ...newScenarios];
      didChange = true;
    }

    storage.setItem(seed.flag, 'true');
  }

  return {
    userScenarios,
    savedScenarios: buildSavedScenarios(userScenarios),
    didChange,
  };
};

export const mergeImportedScenarios = ({
  existingScenarios,
  importedScenarios,
  createId,
}: {
  existingScenarios: SavedScenario[];
  importedScenarios: SavedScenario[];
  createId: () => string;
}): SavedScenario[] => {
  const merged = [...getExportableUserScenarios(existingScenarios)];
  const existingIds = new Set(merged.map((scenario) => scenario.id));
  const existingFingerprints = new Set(merged.map(getScenarioFingerprint));

  for (const importedScenario of importedScenarios) {
    if (RESERVED_SCENARIO_IDS.has(importedScenario.id)) {
      continue;
    }

    const fingerprint = getScenarioFingerprint(importedScenario);
    if (existingFingerprints.has(fingerprint)) {
      continue;
    }

    const nextScenario: SavedScenario = {
      ...importedScenario,
      id:
        !importedScenario.id || existingIds.has(importedScenario.id) || RESERVED_SCENARIO_IDS.has(importedScenario.id)
          ? createId()
          : importedScenario.id,
    };

    merged.push(nextScenario);
    existingIds.add(nextScenario.id);
    existingFingerprints.add(fingerprint);
  }

  return merged;
};
