import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../../..');
const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

const getCallBlock = (source: string, callStart: string) => {
  const startIndex = source.indexOf(callStart);
  expect(startIndex).toBeGreaterThan(-1);

  const endIndex = source.indexOf('\n  });', startIndex);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
};

describe('chat architecture boundaries', () => {
  it('keeps ChatInput composition behind a local provider instead of area prop dictionaries', () => {
    const chatInputSource = readProjectFile('src/components/chat/input/ChatInput.tsx');
    const chatInputAreaSource = readProjectFile('src/components/chat/input/ChatInputArea.tsx');
    const contextPath = path.join(projectRoot, 'src/components/chat/input/ChatInputContext.tsx');

    expect(fs.existsSync(contextPath)).toBe(true);
    expect(chatInputSource).toContain('ChatInputProvider');
    expect(chatInputAreaSource).toContain('useChatInputContext');

    for (const propName of [
      'toolbarLocalProps',
      'actionsLocalProps',
      'slashCommandProps',
      'fileDisplayProps',
      'inputProps',
      'quoteProps',
      'queuedSubmissionProps',
      'layoutProps',
      'fileInputs',
      'formProps',
      'suggestionsProps',
      'liveStatusProps',
      'liveVideoProps',
    ]) {
      expect(chatInputSource).not.toContain(`${propName}={`);
      expect(chatInputAreaSource).not.toContain(`${propName}:`);
    }
  });

  it('keeps message sender store mutations inside the sender boundary', () => {
    const chatHookSource = readProjectFile('src/hooks/chat/useChat.ts');
    const messageSenderSource = readProjectFile('src/hooks/useMessageSender.ts');
    const senderStoreActionsPath = path.join(projectRoot, 'src/features/message-sender/senderStoreActions.ts');

    expect(fs.existsSync(senderStoreActionsPath)).toBe(true);
    expect(messageSenderSource).toContain('createSenderStoreActions');
    expect(messageSenderSource).not.toContain('updateAndPersistSessions: SessionsUpdater');
    expect(messageSenderSource).not.toContain('setActiveSessionId: (id: string | null) => void;');
    expect(messageSenderSource).not.toContain('setSessionLoading: (sessionId: string, isLoading: boolean) => void;');
    expect(messageSenderSource).not.toContain('activeJobs: React.MutableRefObject<Map<string, AbortController>>;');

    const messageSenderCall = getCallBlock(chatHookSource, 'useMessageSender({');
    expect(messageSenderCall).not.toContain('updateAndPersistSessions');
    expect(messageSenderCall).not.toContain('setActiveSessionId');
    expect(messageSenderCall).not.toContain('setSessionLoading');
    expect(messageSenderCall).not.toContain('activeJobs');
  });
});
