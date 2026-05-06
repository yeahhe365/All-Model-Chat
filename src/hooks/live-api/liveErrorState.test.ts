import { describe, expect, it } from 'vitest';
import { getTranslator } from '@/i18n/translations';
import { resolveLiveErrorText } from './liveErrorState';

describe('resolveLiveErrorText', () => {
  it('interpolates translated live error placeholders', () => {
    const t = getTranslator('en');

    const text = resolveLiveErrorText(
      {
        kind: 'translation',
        key: 'liveStatus_reconnecting_attempt',
        values: {
          attempt: 2,
          maxRetries: 5,
        },
      },
      t,
    );

    expect(text).toBe('Connection lost. Reconnecting... (2/5)');
  });
});
