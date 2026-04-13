import { describe, expect, it, vi } from 'vitest';
import { eniManualPasteScenario, fopScenario } from '../constants/defaultScenarios';
import { applyUserScenarioSeeds } from './preloadedScenarioSeeds';

const createStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
};

describe('applyUserScenarioSeeds', () => {
  it('seeds the ENI scenario for existing users when its flag is still missing', () => {
    const storage = createStorage({
      hasSeededJailbreaks_v1: 'true',
      hasSeededAnna_v1: 'true',
    });

    const result = applyUserScenarioSeeds([fopScenario], storage);

    expect(result.didChange).toBe(true);
    expect(result.scenarios).toEqual([fopScenario, eniManualPasteScenario]);
    expect(storage.setItem).toHaveBeenCalledWith('hasSeededEniManualPaste_v1', 'true');
  });
});
