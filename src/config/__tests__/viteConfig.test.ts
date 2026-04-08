import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vite', () => ({
  defineConfig: (config: unknown) => config,
  loadEnv: vi.fn(),
}));

vi.mock('@vitejs/plugin-react', () => ({
  default: vi.fn(() => 'react-plugin'),
}));

vi.mock('vite-plugin-static-copy', () => ({
  viteStaticCopy: vi.fn(() => 'static-copy-plugin'),
}));

import { loadEnv } from 'vite';
import createViteConfig from '../../../vite.config';

describe('vite env contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers VITE_GEMINI_API_KEY over legacy GEMINI_API_KEY', () => {
    vi.mocked(loadEnv).mockReturnValue({
      GEMINI_API_KEY: 'legacy-key',
      VITE_GEMINI_API_KEY: 'vite-key',
    } as any);

    const config = createViteConfig({ mode: 'test' } as any) as any;

    expect(config.define['import.meta.env.VITE_GEMINI_API_KEY']).toBe(JSON.stringify('vite-key'));
  });

  it('falls back to GEMINI_API_KEY when VITE_GEMINI_API_KEY is absent', () => {
    vi.mocked(loadEnv).mockReturnValue({
      GEMINI_API_KEY: 'legacy-key',
    } as any);

    const config = createViteConfig({ mode: 'test' } as any) as any;

    expect(config.define['import.meta.env.VITE_GEMINI_API_KEY']).toBe(JSON.stringify('legacy-key'));
  });
});
