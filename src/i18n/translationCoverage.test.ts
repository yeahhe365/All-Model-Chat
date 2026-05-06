import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { getTranslator, translations } from './translations';

const projectRoot = path.resolve(__dirname, '../..');

const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('translation coverage for protected UI surfaces', () => {
  it('uses real Chinese copy for protected translation keys', () => {
    const t = getTranslator('zh');

    expect(t('fill_input')).toBe('插入');
  });

  it('does not leave protected surfaces with banned hardcoded English copy', () => {
    const protectedStrings: Array<{ file: string; snippets: string[] }> = [
      {
        file: 'src/components/pwa/PwaUpdateBanner.tsx',
        snippets: [
          'A newer version of the app is ready.',
          'Refresh to update the installed shell and latest assets.',
          "'Later'",
          "'Refresh'",
        ],
      },
      {
        file: 'src/components/log-viewer/LogViewer.tsx',
        snippets: [
          "'System Logs'",
          "'Console'",
          "'Usage'",
          "'Overview'",
          "'Tokens'",
          "'API Keys'",
          "'Clear Logs'",
          'Are you sure you want to clear all logs and usage statistics from the database?',
        ],
      },
      {
        file: 'src/components/log-viewer/ConsoleTab.tsx',
        snippets: [
          "'Search logs...'",
          "'All Categories'",
          "'Export JSON'",
          "'No logs found'",
          "'Load older logs'",
          "'Clear'",
        ],
      },
      {
        file: 'src/components/log-viewer/TokenUsageTab.tsx',
        snippets: [
          "'Token Usage Statistics'",
          "'No token usage recorded yet.'",
          "'Input Tokens'",
          "'Output Tokens'",
          "'Total Tokens'",
        ],
      },
      {
        file: 'src/components/log-viewer/ApiUsageTab.tsx',
        snippets: ["'API Key Usage Statistics'", "'Active'", "'requests'"],
      },
      {
        file: 'src/components/message/buttons/export/ExportModal.tsx',
        snippets: ['Close export dialog', 'Processing message content...'],
      },
      {
        file: 'src/components/message/buttons/export/ExportOptions.tsx',
        snippets: [
          'Visual snapshot',
          'Web page format',
          'Plain text',
          'Raw data',
          'PNG Image',
          'HTML File',
          'TXT File',
          'JSON File',
        ],
      },
      {
        file: 'src/components/message/blocks/parts/DiagramWrapper.tsx',
        snippets: ['Hide Source', 'Show Source', 'Open in Side Panel', 'Zoom Diagram', 'Download as JPG', 'Copy Code'],
      },
      {
        file: 'src/components/scenarios/editor/ScenarioMessageList.tsx',
        snippets: ['No messages yet.', 'Add messages below to script the conversation flow.', 'Press Enter to save'],
      },
      {
        file: 'src/components/scenarios/editor/ScenarioMessageInput.tsx',
        snippets: ['Add Message As', '> User<', '> Model<'],
      },
      {
        file: 'src/components/scenarios/editor/ScenarioSystemPrompt.tsx',
        snippets: ["'Expand'", 'Define the persona, style, and rules for the AI.'],
      },
      {
        file: 'src/components/scenarios/ScenarioList.tsx',
        snippets: ['No scenarios found.', 'Clear search query'],
      },
      {
        file: 'src/components/shared/file-preview/FilePreviewHeader.tsx',
        snippets: [
          "'Filename'",
          "'Save Changes'",
          "'Edit File'",
          "'Copy Content'",
          "'Download SVG'",
          "'Download File'",
          "'Cancel Edit'",
          'Failed to copy to clipboard. Your browser might not support this feature or require permissions.',
        ],
      },
      {
        file: 'src/components/shared/file-preview/TextFileViewer.tsx',
        snippets: ['Failed to load file content.', 'Loading content...'],
      },
      {
        file: 'src/components/shared/file-preview/ImageViewer.tsx',
        snippets: ["'Zoom Out'", "'Zoom In'", "'Reset View'"],
      },
      {
        file: 'src/components/shared/file-preview/pdf-viewer/PdfToolbar.tsx',
        snippets: ["'Toggle Thumbnails'", "'Previous Page'", "'Next Page'", "'Page number'", "'Rotate'"],
      },
      {
        file: 'src/components/shared/file-preview/pdf-viewer/PdfMainContent.tsx',
        snippets: ['Loading PDF...'],
      },
      {
        file: 'src/components/modals/FilePreviewModal.tsx',
        snippets: [
          "'Previous'",
          "'Next'",
          'Loading Word preview...',
          'Unable to preview this Word document.',
          'Loading PDF viewer...',
          "'YouTube video player'",
          'Invalid YouTube URL',
          'Preview not available for this file type.',
        ],
      },
      {
        file: 'src/components/modals/html-preview/HtmlPreviewHeader.tsx',
        snippets: [
          '"React App"',
          '"HTML Preview"',
          '"Zoom Out"',
          '"Zoom In"',
          '"Reload"',
          '"Download HTML"',
          '"Screenshot"',
          '"Exit Fullscreen"',
          '"Fullscreen"',
          '"Close"',
        ],
      },
      {
        file: 'src/components/modals/html-preview/HtmlPreviewContent.tsx',
        snippets: ['"HTML Content Preview"'],
      },
      {
        file: 'src/components/header/Header.tsx',
        snippets: ["'Exit Picture-in-Picture'", "'Enter Picture-in-Picture'"],
      },
      {
        file: 'src/components/header/HeaderModelSelector.tsx',
        snippets: [
          "'Toggle reasoning mode'",
          "'Toggle thinking level'",
          "'Reasoning: Minimal (Fast Mode)'",
          "'Reasoning: High'",
          "'Thinking: High (Pro Mode)'",
        ],
      },
      {
        file: 'src/components/modals/HelpModal.tsx',
        snippets: ['"Search commands..."', '"Click to copy"', 'No commands found matching', 'Tip: Type'],
      },
      {
        file: 'src/components/modals/AudioRecorder.tsx',
        snippets: [
          'Voice Recorder',
          'Preview Recording',
          'Ready to record',
          'Accessing microphone...',
          'Record microphone',
          'Mic input only',
          'Record system audio',
          'System audio + mic',
          'Browser permission is required for system audio.',
          'Total Duration',
          '>Recording<',
          'Failed to save recording.',
        ],
      },
      {
        file: 'src/components/recorder/RecorderControls.tsx',
        snippets: ['Start Recording', 'Stop Recording', '>Discard<', 'Saving...', 'Save Recording'],
      },
      {
        file: 'src/components/chat/input/QueuedSubmissionCard.tsx',
        snippets: ['Edit queued message', 'Remove queued message'],
      },
      {
        file: 'src/components/shared/AudioPlayer.tsx',
        snippets: ['"Pause"', '"Play"', '"Playback Speed"', '"Download Audio"'],
      },
      {
        file: 'src/hooks/useMessageSender.ts',
        snippets: [
          '"Wait for files to finish processing."',
          '"This image model supports image attachments only."',
          '"Imagen models support text prompts only."',
          "'No model selected.'",
          '"API Key Error"',
        ],
      },
      {
        file: 'src/hooks/file-upload/useFileIdAdder.ts',
        snippets: ["'File API processing failed'", "'File not found.'", "'API key not configured.'", "'Fetch error'"],
      },
    ];

    protectedStrings.forEach(({ file, snippets }) => {
      const source = readProjectFile(file);

      snippets.forEach((snippet) => {
        expect(source).not.toContain(snippet);
      });
    });
  });

  it('defines translations for every t() key used in source files', () => {
    const sourceFiles = ['src/components', 'src/hooks', 'src/utils'];

    const collectFiles = (dir: string): string[] =>
      fs.readdirSync(path.join(projectRoot, dir), { withFileTypes: true }).flatMap((entry) => {
        const relativePath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return collectFiles(relativePath);
        }
        if (!relativePath.endsWith('.ts') && !relativePath.endsWith('.tsx')) {
          return [];
        }
        if (relativePath.includes('.test.') || relativePath.includes('__tests__')) {
          return [];
        }
        return [relativePath];
      });

    const usedKeys = new Set<string>();
    const keyPattern = /\bt\('([^']+)'/g;

    sourceFiles.flatMap(collectFiles).forEach((file) => {
      const source = readProjectFile(file);
      let match: RegExpExecArray | null;

      while ((match = keyPattern.exec(source)) !== null) {
        usedKeys.add(match[1]);
      }
    });

    usedKeys.forEach((key) => {
      expect(translations).toHaveProperty(key);
    });
  });
});
