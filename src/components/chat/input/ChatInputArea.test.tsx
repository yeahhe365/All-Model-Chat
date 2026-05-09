import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const chatInputAreaPath = path.resolve(__dirname, './ChatInputArea.tsx');
const chatInputAreaLayoutPath = path.resolve(__dirname, './useChatInputAreaLayout.ts');
const chatInputStatePath = path.resolve(__dirname, '../../../hooks/chat-input/useChatInputState.ts');

describe('ChatInputArea default spacing', () => {
  it('uses the reduced default vertical padding for the non-fullscreen input container', () => {
    const source = fs.readFileSync(chatInputAreaLayoutPath, 'utf8');

    expect(source).toContain('px-3 py-1.5 sm:px-4 sm:py-2');
    expect(source).not.toContain('pb-[calc(3.15rem+0.486rem)]');
    expect(source).not.toContain('sm:pb-[calc(3.15rem+0.648rem)]');
    expect(source).not.toContain('bg-[var(--theme-bg-input)] p-3 sm:p-4');
  });

  it('doubles the non-fullscreen bottom safe-area spacing below the input area', () => {
    const source = fs.readFileSync(chatInputAreaLayoutPath, 'utf8');

    expect(source).toContain('pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]');
    expect(source).not.toContain('pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]');
  });

  it('keeps the action row in normal flow without an internal divider line', () => {
    const source = fs.readFileSync(chatInputAreaLayoutPath, 'utf8');

    expect(source).toContain('const actionsContainerClass =');
    expect(source).toContain('flex items-center justify-between pt-1');
    expect(source).not.toContain('border-t');
    expect(source).not.toContain('border-[var(--theme-border-secondary)]/40');
    expect(source).not.toContain('absolute bottom-');
    expect(source).not.toContain('mt-auto pt-1 relative z-10');
  });

  it('uses one text line as the default textarea height', () => {
    const source = fs.readFileSync(chatInputStatePath, 'utf8');

    expect(source).toContain('export const INITIAL_TEXTAREA_HEIGHT_PX = 24;');
    expect(source).not.toContain('export const INITIAL_TEXTAREA_HEIGHT_PX = 25.2;');
    expect(source).not.toContain('export const INITIAL_TEXTAREA_HEIGHT_PX = 28;');
  });

  it('focuses the textarea when users tap the non-interactive input shell', () => {
    const source = fs.readFileSync(chatInputAreaPath, 'utf8');

    expect(source).toContain('const focusBlockingSelector =');
    expect(source).toContain('onClick={handleInputShellClick}');
  });

  it('does not rebuild toolbar and action context data into intermediate prop objects', () => {
    const source = fs.readFileSync(chatInputAreaPath, 'utf8');

    expect(source).not.toContain('const toolbarState =');
    expect(source).not.toContain('const actionState =');
    expect(source).toContain('<ChatInputToolbar />');
    expect(source).toContain('<ChatInputActions />');
    expect(source).not.toContain('<ChatInputToolbar {...');
    expect(source).not.toContain('<ChatInputActions {...');
  });

  it('mounts a hidden Live video element so screen and camera streams can be captured', () => {
    const source = fs.readFileSync(chatInputAreaPath, 'utf8');

    expect(source).toContain('capabilities.isNativeAudioModel');
    expect(source).toContain('<video');
    expect(source).toContain('ref={liveAPI.videoRef}');
    expect(source).toContain('autoPlay');
    expect(source).toContain('playsInline');
    expect(source).toContain('aria-hidden="true"');
  });

  it('keeps action controls independently enabled while textarea-only states are blocked', () => {
    const source = fs.readFileSync(chatInputAreaPath, 'utf8');
    const providerSource = fs.readFileSync(path.resolve(__dirname, './ChatInputProvider.tsx'), 'utf8');

    expect(providerSource).toContain('const actionDisabled =');
    expect(providerSource).toContain(
      'inputState.isAddingById || isAnyModalOpen || inputState.isWaitingForUpload || localFileState.isConverting;',
    );
    expect(providerSource).toContain('disabled: actionDisabled,');
    expect(source).not.toContain('const actionDisabled =');
    expect(source).not.toContain(
      'disabled: inputState.isAddingById || inputState.isWaitingForUpload || isConverting || inputDisabled,',
    );
  });

  it('renders the queued submission strip above the input shell instead of inside it', () => {
    const source = fs.readFileSync(chatInputAreaPath, 'utf8');
    const layoutSource = fs.readFileSync(chatInputAreaLayoutPath, 'utf8');

    const queuedStripIndex = source.indexOf('className={queuedSubmissionContainerClass}');
    const inputShellIndex = source.indexOf('className={inputContainerClass} onClick={handleInputShellClick}');
    const inputShellEndIndex = source.indexOf('<ChatTextArea', inputShellIndex);

    expect(layoutSource).toContain('const queuedSubmissionContainerClass =');
    expect(queuedStripIndex).toBeGreaterThan(-1);
    expect(inputShellIndex).toBeGreaterThan(-1);
    expect(queuedStripIndex).toBeLessThan(inputShellIndex);
    expect(source.slice(inputShellIndex, inputShellEndIndex)).not.toContain('QueuedSubmissionCard');
  });

  it('uses an inset queued strip that visually docks to the wider composer shell', () => {
    const source = fs.readFileSync(chatInputAreaLayoutPath, 'utf8');

    expect(source).toContain('relative z-10 mx-5 mb-[-22px] -translate-y-1.5');
    expect(source).toContain(
      'shadow-lg transition-colors duration-200 focus-within:border-[var(--theme-border-focus)] relative z-20',
    );
  });
});
