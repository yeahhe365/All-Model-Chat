import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const chatInputAreaPath = path.resolve(__dirname, './ChatInputArea.tsx');
const chatInputAreaLayoutPath = path.resolve(__dirname, './useChatInputAreaLayout.ts');
const chatInputStatePath = path.resolve(__dirname, '../../../hooks/chat-input/useChatInputState.ts');

describe('ChatInputArea default spacing', () => {
  it('uses the reduced default vertical padding for the non-fullscreen input container', () => {
    const source = fs.readFileSync(chatInputAreaLayoutPath, 'utf8');

    expect(source).toContain(
      'px-3 py-[0.486rem] pb-[calc(3.15rem+0.486rem)] sm:px-4 sm:py-[0.648rem] sm:pb-[calc(3.15rem+0.648rem)]',
    );
    expect(source).not.toContain('pb-[calc(3.5rem+0.54rem)]');
    expect(source).not.toContain('sm:pb-[calc(3.5rem+0.72rem)]');
    expect(source).not.toContain('bg-[var(--theme-bg-input)] p-3 sm:p-4');
  });

  it('doubles the non-fullscreen bottom safe-area spacing below the input area', () => {
    const source = fs.readFileSync(chatInputAreaLayoutPath, 'utf8');

    expect(source).toContain('pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]');
    expect(source).not.toContain('pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]');
  });

  it('keeps the action row anchored to the same absolute insets in fullscreen and regular modes', () => {
    const source = fs.readFileSync(chatInputAreaLayoutPath, 'utf8');

    expect(source).toContain('const actionsContainerClass =');
    expect(source).toContain(
      'absolute bottom-[0.486rem] left-3 right-3 sm:bottom-[0.648rem] sm:left-4 sm:right-4 flex items-center justify-between z-10',
    );
    expect(source).not.toContain('mt-auto pt-1 relative z-10');
  });

  it('uses a ten-percent shorter default textarea height', () => {
    const source = fs.readFileSync(chatInputStatePath, 'utf8');

    expect(source).toContain('export const INITIAL_TEXTAREA_HEIGHT_PX = 25.2;');
    expect(source).not.toContain('export const INITIAL_TEXTAREA_HEIGHT_PX = 28;');
  });

  it('focuses the textarea when users tap the non-interactive input shell', () => {
    const source = fs.readFileSync(chatInputAreaPath, 'utf8');

    expect(source).toContain('const focusBlockingSelector =');
    expect(source).toContain('onClick={handleInputShellClick}');
  });

  it('mounts a hidden Live video element so screen and camera streams can be captured', () => {
    const source = fs.readFileSync(chatInputAreaPath, 'utf8');

    expect(source).toContain('liveVideoProps');
    expect(source).toContain('<video');
    expect(source).toContain('ref={liveVideoProps.videoRef}');
    expect(source).toContain('autoPlay');
    expect(source).toContain('playsInline');
    expect(source).toContain('aria-hidden="true"');
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
      'shadow-lg transition-all duration-300 focus-within:border-[var(--theme-border-focus)] relative z-20',
    );
  });
});
