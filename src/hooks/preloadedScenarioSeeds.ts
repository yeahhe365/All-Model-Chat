import { SavedScenario } from '../types';
import {
  annaScenario,
  eniManualPasteScenario,
  fopScenario,
  pyriteScenario,
  unrestrictedScenario,
} from '../constants/defaultScenarios';

type ScenarioSeedStorage = Pick<Storage, 'getItem' | 'setItem'>;

const USER_SCENARIO_SEEDS = [
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
] as const;

export const applyUserScenarioSeeds = (storedScenarios: SavedScenario[], storage: ScenarioSeedStorage) => {
  let scenarios = storedScenarios;
  let didChange = false;

  for (const seed of USER_SCENARIO_SEEDS) {
    if (storage.getItem(seed.flag)) {
      continue;
    }

    const newScenarios = seed.scenarios.filter(
      (scenario) => !scenarios.some((storedScenario) => storedScenario.id === scenario.id),
    );

    if (newScenarios.length > 0) {
      scenarios = [...scenarios, ...newScenarios];
      didChange = true;
    }

    storage.setItem(seed.flag, 'true');
  }

  return {
    scenarios,
    didChange,
  };
};
