
import { UploadedFile } from '../../types';
import { generateUniqueId } from './ids';
import { base64ToBlob, getExtensionFromMimeType } from '../fileHelpers';

export const parseThoughtProcess = (thoughts: string | undefined) => {
    if (!thoughts) return null;

    const lines = thoughts.trim().split('\n');
    let lastHeadingIndex = -1;
    let lastHeading = '';

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        // Check for ## or ### headings
        if (line.startsWith('## ') || line.startsWith('### ')) {
            lastHeadingIndex = i;
            lastHeading = line.replace(/^[#]+\s*/, '').trim();
            break;
        }
        // Check for lines that are entirely bolded (e.g., **Title**)
        if ((line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) || 
            (line.startsWith('__') && line.endsWith('__') && !line.slice(2, -2).includes('__'))) {
            lastHeadingIndex = i;
            // Remove the bold markers from the start and end
            lastHeading = line.substring(2, line.length - 2).trim();
            break;
        }
    }

    if (lastHeadingIndex === -1) {
            const content = lines.slice(-5).join('\n').trim();
            return { title: 'Latest thought', content, isFallback: true };
    }
    
    const contentLines = lines.slice(lastHeadingIndex + 1);
    const content = contentLines.filter(l => l.trim() !== '').join('\n').trim();

    return { title: lastHeading, content, isFallback: false };
};

/**
 * Creates a standardized UploadedFile object from Base64 data.
 * Used for handling generated content from API (images, audio, etc.)
 */
export const createUploadedFileFromBase64 = (
    base64Data: string, 
    mimeType: string, 
    baseName: string = 'generated-file'
): UploadedFile => {
    const ext = getExtensionFromMimeType(mimeType);
    
    // Ensure filename ends with extension
    let fileName = baseName;
    if (!fileName.toLowerCase().endsWith(ext)) {
        // If baseName is generic "generated-file", append random ID
        if (baseName === 'generated-file' || baseName === 'generated-image') {
            fileName = `${baseName}-${generateUniqueId().slice(-4)}${ext}`;
        } else {
            fileName = `${baseName}${ext}`;
        }
    }

    const blob = base64ToBlob(base64Data, mimeType);
    const file = new File([blob], fileName, { type: mimeType });
    const dataUrl = URL.createObjectURL(file);

    return {
        id: generateUniqueId(),
        name: fileName,
        type: mimeType,
        size: blob.size,
        dataUrl: dataUrl,
        rawFile: file,
        uploadState: 'active'
    };
};
