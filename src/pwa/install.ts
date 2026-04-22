export type PwaInstallState = 'available' | 'manual' | 'installed';

interface PwaInstallSnapshot {
  state: PwaInstallState;
  canInstall: boolean;
}

const resolveLanguage = (language: 'en' | 'zh' | 'system', navigatorLanguage?: string) => {
  if (language !== 'system') {
    return language;
  }

  return navigatorLanguage?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

export const isStandaloneMode = (win: Window = window) => {
  const displayModeStandalone = win.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const navigatorStandalone = Boolean((win.navigator as Navigator & { standalone?: boolean }).standalone);

  return displayModeStandalone || navigatorStandalone;
};

export const getPwaInstallState = ({
  installPromptEvent,
  win = window,
}: {
  installPromptEvent: BeforeInstallPromptEvent | null;
  win?: Window;
}): PwaInstallSnapshot => {
  if (isStandaloneMode(win)) {
    return {
      state: 'installed',
      canInstall: false,
    };
  }

  if (installPromptEvent) {
    return {
      state: 'available',
      canInstall: true,
    };
  }

  return {
    state: 'manual',
    canInstall: true,
  };
};

export const getManualInstallMessage = (
  language: 'en' | 'zh' | 'system' = 'en',
  navigatorLanguage = typeof navigator !== 'undefined' ? navigator.language : 'en',
) => {
  const resolvedLanguage = resolveLanguage(language, navigatorLanguage);

  return resolvedLanguage === 'zh'
    ? '请使用浏览器菜单将此应用安装到设备。'
    : 'Use your browser menu to install this app.';
};
