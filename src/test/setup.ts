import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { ensureAllFeatureTranslations } from '@/i18n/translations';

import { installBrowserTestEnvironment, resetBrowserTestEnvironment } from './browserEnvironment';

// installBrowserTestEnvironment centralizes IS_REACT_ACT_ENVIRONMENT and browser API shims.
installBrowserTestEnvironment();

await ensureAllFeatureTranslations();

afterEach(() => {
  cleanup();
  resetBrowserTestEnvironment();

  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});
