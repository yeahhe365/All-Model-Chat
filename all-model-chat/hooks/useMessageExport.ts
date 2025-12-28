
import { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { ChatMessage } from '../types';
import {
    exportElementAsPng,
    exportHtmlStringAsFile,
    exportTextStringAsFile,
    triggerDownload,
    sanitizeFilename,
    generateExportHtmlTemplate,
    generateExportTxtTemplate,
    gatherPageStyles,
    createSnapshotContainer,
    embedImagesInClone
} from '../utils/exportUtils';

interface UseMessageExportProps {
    message: ChatMessage;
    sessionTitle?: string;
    messageIndex?: number;
    themeId: string;
}

export type ExportType = 'png' | 'html' | 'txt' | 'json';

export const useMessageExport = ({ message, sessionTitle, messageIndex, themeId }: UseMessageExportProps) => {
    const [exportingType, setExportingType] = useState<ExportType | null>(null);

    const handleExport = async (type: ExportType, onSuccess?: () => void) => {
        if (exportingType) return;
        setExportingType(type);

        try {
            const markdownContent = message.content || '';
            const messageId = message.id;
            const shortId = messageId.slice(-6);

            let filenameBase = `message-${shortId}`;

            if (sessionTitle) {
                const safeTitle = sanitizeFilename(sessionTitle);
                const indexStr = messageIndex !== undefined ? `_msg_${messageIndex + 1}` : '';
                filenameBase = `${safeTitle}${indexStr}`;
            } else {
                const contentSnippet = markdownContent.replace(/[^\w\s]/gi, '').split(' ').slice(0, 5).join('_');
                const safeSnippet = sanitizeFilename(contentSnippet) || 'message';
                filenameBase = `${safeSnippet}-${shortId}`;
            }

            const dateObj = new Date(message.timestamp);
            const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();

            // Small delay to allow UI to update to "Exporting..." state
            if (type !== 'png') {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            if (type === 'png') {
                // Attempt to find the rendered DOM bubble to preserve Math/Syntax/Diagrams
                const messageBubble = document.querySelector(`[data-message-id="${message.id}"] > div > .shadow-sm`);

                let contentNode: HTMLElement;

                if (messageBubble) {
                    // Clone the full bubble (includes files, thoughts, and formatted content)
                    contentNode = messageBubble.cloneNode(true) as HTMLElement;

                    // Embed images to ensure they render in the screenshot (handles CORS/Blob URLs)
                    await embedImagesInClone(contentNode);

                    // Expand any collapsed details (like thoughts) so they are visible in export.
                    contentNode.querySelectorAll('details').forEach(details => details.setAttribute('open', 'true'));
                } else {
                    // Fallback to raw markdown parsing if DOM finding fails
                    const rawHtml = marked.parse(markdownContent);
                    const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);
                    const wrapper = document.createElement('div');
                    wrapper.className = 'markdown-body';
                    wrapper.innerHTML = sanitizedHtml;

                    wrapper.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block as HTMLElement);
                    });

                    contentNode = wrapper;
                }

                let cleanup = () => { };
                try {
                    const { container, innerContent, remove, rootBgColor } = await createSnapshotContainer(
                        themeId,
                        '800px'
                    );
                    cleanup = remove;

                    const headerHtml = `
                        <div style="padding: 2rem 2rem 1rem 2rem; border-bottom: 1px solid var(--theme-border-secondary); margin-bottom: 1rem;">
                            <h1 style="font-size: 1.5rem; font-weight: bold; color: var(--theme-text-primary); margin-bottom: 0.5rem;">Exported Message</h1>
                            <div style="font-size: 0.875rem; color: var(--theme-text-tertiary); display: flex; gap: 1rem;">
                                <span>${dateStr}</span>
                                <span>•</span>
                                <span>ID: ${shortId}</span>
                            </div>
                        </div>
                    `;

                    const headerDiv = document.createElement('div');
                    headerDiv.innerHTML = headerHtml;
                    innerContent.appendChild(headerDiv);

                    const bodyDiv = document.createElement('div');
                    bodyDiv.style.padding = '0 2rem 2rem 2rem';
                    bodyDiv.appendChild(contentNode);
                    innerContent.appendChild(bodyDiv);

                    // Wait for layout/images
                    await new Promise(resolve => setTimeout(resolve, 800));

                    await exportElementAsPng(container, `${filenameBase}.png`, { backgroundColor: rootBgColor, scale: 2.5 });
                } finally {
                    cleanup();
                }

            } else if (type === 'html') {
                const rawHtml = marked.parse(markdownContent);
                const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);
                const styles = await gatherPageStyles();
                const bodyClasses = document.body.className;
                const rootBgColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg-primary');

                const fullHtml = generateExportHtmlTemplate({
                    title: `Message ${shortId}`,
                    date: dateStr,
                    model: `ID: ${shortId}`,
                    contentHtml: `<div class="markdown-body">${sanitizedHtml}</div>`,
                    styles,
                    themeId,
                    language: 'en',
                    rootBgColor,
                    bodyClasses
                });

                exportHtmlStringAsFile(fullHtml, `${filenameBase}.html`);

            } else if (type === 'txt') {
                const txtContent = generateExportTxtTemplate({
                    title: `Message Export ${shortId}`,
                    date: dateStr,
                    model: 'N/A',
                    messages: [{
                        role: message.role === 'user' ? 'USER' : 'ASSISTANT',
                        timestamp: new Date(message.timestamp),
                        content: markdownContent,
                        files: message.files?.map(f => ({ name: f.name }))
                    }]
                });
                exportTextStringAsFile(txtContent, `${filenameBase}.txt`);
            } else if (type === 'json') {
                const blob = new Blob([JSON.stringify(message, null, 2)], { type: 'application/json' });
                triggerDownload(URL.createObjectURL(blob), `${filenameBase}.json`);
            }
            
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(`Failed to export message as ${type.toUpperCase()}:`, err);
            alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setExportingType(null);
        }
    };

    return {
        exportingType,
        handleExport
    };
};
