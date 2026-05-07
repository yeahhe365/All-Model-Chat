import { beforeEach, describe, expect, it } from 'vitest';
import { useChatDraftStore } from './chatDraftStore';

describe('chatDraftStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useChatDraftStore.setState({ drafts: {} });
  });

  it('hydrates a session draft from legacy localStorage keys and removes the old entries', () => {
    localStorage.setItem('chatDraft_session-a', 'hello');
    localStorage.setItem('chatQuotes_session-a', JSON.stringify(['quoted']));
    localStorage.setItem('chatTtsContext_session-a', 'voice note');

    useChatDraftStore.getState().hydrateLegacySessionDraft('session-a');

    expect(useChatDraftStore.getState().drafts['session-a']).toEqual({
      inputText: 'hello',
      quotes: ['quoted'],
      ttsContext: 'voice note',
    });
    expect(localStorage.getItem('chatDraft_session-a')).toBeNull();
    expect(localStorage.getItem('chatQuotes_session-a')).toBeNull();
    expect(localStorage.getItem('chatTtsContext_session-a')).toBeNull();
  });

  it('clears the sendable draft while preserving the session TTS context', () => {
    useChatDraftStore.setState({
      drafts: {
        'session-a': {
          inputText: 'send me',
          quotes: ['quoted'],
          ttsContext: 'keep speaking style',
        },
      },
    });

    useChatDraftStore.getState().clearCurrentDraft('session-a');

    expect(useChatDraftStore.getState().drafts['session-a']).toEqual({
      inputText: '',
      quotes: [],
      ttsContext: 'keep speaking style',
    });
  });
});
