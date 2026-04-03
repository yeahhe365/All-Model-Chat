
import { ALL_SUPPORTED_MIME_TYPES } from '../constants/fileConstants';
import { convertHtmlToMarkdown } from './htmlToMarkdown';

export const PASTE_TEXT_AS_FILE_THRESHOLD = 5000;

export type PasteResult = 
    | { type: 'files'; files: File[] }
    | { type: 'large-text-file'; files: File[] }
    | { type: 'markdown'; content: string }
    | { type: 'text'; content: string }
    | { type: 'empty' };

export const processClipboardData = (
    clipboardData: DataTransfer | null,
    options: {
        isPasteRichTextAsMarkdownEnabled: boolean;
        isPasteAsTextFileEnabled: boolean;
    }
): PasteResult => {
    if (!clipboardData) return { type: 'empty' };

    // 1. Check for Physical Files
    const items = clipboardData.items;
    const filesToProcess: File[] = [];
    if (items) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && ALL_SUPPORTED_MIME_TYPES.includes(item.type)) {
                const file = item.getAsFile();
                if (file) filesToProcess.push(file);
            }
        }
    }

    if (filesToProcess.length > 0) {
        return { type: 'files', files: filesToProcess };
    }

    const pastedText = clipboardData.getData('text/plain');
    const htmlContent = clipboardData.getData('text/html');

    // 2. Handle Large Text Content as File
    if (options.isPasteAsTextFileEnabled && pastedText && pastedText.length > PASTE_TEXT_AS_FILE_THRESHOLD) {
        const timestamp = Math.floor(Date.now() / 1000);
        const fileName = `pasted_content_${timestamp}.txt`;
        const file = new File([pastedText], fileName, { type: 'text/plain' });
        return { type: 'large-text-file', files: [file] };
    }

    // 3. Handle Rich Text (HTML -> Markdown)
    if (htmlContent && options.isPasteRichTextAsMarkdownEnabled) {
        const hasTags = /<[a-z][\s\S]*>/i.test(htmlContent);
        if (hasTags) {
            const markdown = convertHtmlToMarkdown(htmlContent);
            if (markdown) {
                return { type: 'markdown', content: markdown };
            }
        }
    }

    // 4. Handle Plain Text
    if (pastedText) {
        return { type: 'text', content: pastedText };
    }

    return { type: 'empty' };
};
