import { describe, expect, it } from 'vitest';
import { getPwaInstallState } from './install';

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
  it('returns installed state for standalone display mode', () => {
    expect(
      getPwaInstallState({
        installPromptEvent: null,
        win: createWindowLike({ standaloneDisplayMode: true }),
      }).state,
    ).toBe('installed');
  });

  it('returns installed state for iOS navigator.standalone', () => {
    expect(
      getPwaInstallState({
        installPromptEvent: null,
        win: createWindowLike({ navigatorStandalone: true }),
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
