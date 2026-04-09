import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

interface MountedRoot {
  container: HTMLDivElement;
  root: Root;
}

const mountedRoots: MountedRoot[] = [];

const renderIntoDom = (ui: JSX.Element) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  const mounted = { container, root };
  mountedRoots.push(mounted);
  return mounted;
};

afterEach(() => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop()!;
    act(() => {
      mounted.root.unmount();
    });
    mounted.container.remove();
  }
  vi.resetModules();
  vi.doUnmock('../../modals/AudioRecorder');
  vi.doUnmock('../../modals/CreateTextFileEditor');
  vi.doUnmock('../../modals/HelpModal');
  vi.doUnmock('../../modals/TextEditorModal');
  vi.doUnmock('../../modals/FileConfigurationModal');
  vi.doUnmock('../../modals/TokenCountModal');
  vi.doUnmock('../../modals/FilePreviewModal');
});

describe('lazy modal loading', () => {
  it('does not eagerly import ChatInputModals children when all modal flags are false', async () => {
    vi.doMock('../../modals/AudioRecorder', () => {
      throw new Error('AudioRecorder should not load while closed');
    });
    vi.doMock('../../modals/CreateTextFileEditor', () => {
      throw new Error('CreateTextFileEditor should not load while closed');
    });
    vi.doMock('../../modals/HelpModal', () => {
      throw new Error('HelpModal should not load while closed');
    });
    vi.doMock('../../modals/TextEditorModal', () => {
      throw new Error('TextEditorModal should not load while closed');
    });

    const { ChatInputModals } = await import('../ChatInputModals');
    const { container } = renderIntoDom(
      <ChatInputModals
        showRecorder={false}
        onAudioRecord={vi.fn()}
        onRecorderCancel={vi.fn()}
        showCreateTextFileEditor={false}
        onConfirmCreateTextFile={vi.fn()}
        onCreateTextFileCancel={vi.fn()}
        isHelpModalOpen={false}
        onHelpModalClose={vi.fn()}
        allCommandsForHelp={[]}
        isProcessingFile={false}
        isLoading={false}
        t={(key) => key}
        themeId="pearl"
        showTtsContextEditor={false}
      />
    );

    expect(container.innerHTML).toBe('');
  });

  it('does not eagerly import ChatInputFileModals children when all modal flags are closed', async () => {
    vi.doMock('../../modals/FileConfigurationModal', () => {
      throw new Error('FileConfigurationModal should not load while closed');
    });
    vi.doMock('../../modals/TokenCountModal', () => {
      throw new Error('TokenCountModal should not load while closed');
    });
    vi.doMock('../../modals/FilePreviewModal', () => {
      throw new Error('FilePreviewModal should not load while closed');
    });

    const { ChatInputFileModals } = await import('../ChatInputFileModals');
    const { container } = renderIntoDom(
      <ChatInputFileModals
        configuringFile={null}
        setConfiguringFile={vi.fn()}
        showTokenModal={false}
        setShowTokenModal={vi.fn()}
        previewFile={null}
        setPreviewFile={vi.fn()}
        inputText=""
        selectedFiles={[]}
        appSettings={{} as never}
        availableModels={[]}
        currentModelId="gemini-2.5-flash"
        t={(key) => key}
        isGemini3={false}
        handlers={{
          handleSaveFileConfig: vi.fn(),
          handlePrevImage: vi.fn(),
          handleNextImage: vi.fn(),
          currentImageIndex: -1,
          inputImages: [],
        }}
      />
    );

    expect(container.innerHTML).toBe('');
  });
});
