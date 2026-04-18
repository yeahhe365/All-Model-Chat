import { describe, expect, it } from 'vitest';
import { getPwaInstallState, isStandaloneMode } from './install';

const createWindowLike = ({
  standaloneDisplayMode = false,
  navigatorStandalone = false,
}: {
  standaloneDisplayMode?: boolean;
  navigatorStandalone?: boolean;
}) =>
  ({
    matchMedia: (query: string) => ({
      matches: query === '(display-mode: standalone)' ? standaloneDisplayMode : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
    navigator: {
      standalone: navigatorStandalone,
    },
  }) as unknown as Window;

describe('install helpers', () => {
  it('detects standalone mode from display mode media query', () => {
    expect(isStandaloneMode(createWindowLike({ standaloneDisplayMode: true }))).toBe(true);
  });

  it('detects standalone mode from iOS navigator.standalone', () => {
    expect(isStandaloneMode(createWindowLike({ navigatorStandalone: true }))).toBe(true);
  });

  it('returns installed state when already running standalone', () => {
    expect(
      getPwaInstallState({
        installPromptEvent: null,
        win: createWindowLike({ standaloneDisplayMode: true }),
      }).state,
    ).toBe('installed');
  });

  it('returns available state when a deferred install prompt exists', () => {
    expect(
      getPwaInstallState({
        installPromptEvent: {} as BeforeInstallPromptEvent,
        win: createWindowLike({}),
      }).state,
    ).toBe('available');
  });

  it('falls back to manual install guidance when no deferred prompt is available', () => {
    expect(
      getPwaInstallState({
        installPromptEvent: null,
        win: createWindowLike({}),
      }),
    ).toMatchObject({
      state: 'manual',
      canInstall: true,
    });
  });
});
