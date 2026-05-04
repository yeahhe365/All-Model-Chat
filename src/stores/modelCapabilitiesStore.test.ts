import { beforeEach, describe, expect, it } from 'vitest';
import { useModelCapabilitiesStore } from './modelCapabilitiesStore';

describe('modelCapabilitiesStore', () => {
  beforeEach(() => {
    useModelCapabilitiesStore.setState({ capabilitiesByModelId: {} });
  });

  it('computes and caches capabilities by model id', () => {
    const first = useModelCapabilitiesStore.getState().getCapabilities('gemini-3-pro-image-preview');
    const second = useModelCapabilitiesStore.getState().getCapabilities('gemini-3-pro-image-preview');

    expect(first).toBe(second);
    expect(first.isGemini3ImageModel).toBe(true);
    expect(first.supportedImageSizes).toEqual(['1K', '2K', '4K']);
    expect(Object.keys(useModelCapabilitiesStore.getState().capabilitiesByModelId)).toEqual([
      'gemini-3-pro-image-preview',
    ]);
  });

  it('normalizes empty model ids into a stable cache key', () => {
    const capabilities = useModelCapabilitiesStore.getState().getCapabilities('');

    expect(capabilities.isGemini3).toBe(false);
    expect(useModelCapabilitiesStore.getState().capabilitiesByModelId.__empty__).toBe(capabilities);
  });
});
