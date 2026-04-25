

import { useState } from 'react';
import { ChatMessage } from '../types';
import { serializeMessageForPortableExport } from '../utils/chat/session';
import { triggerDownload } from '../utils/export/core';
import {
    buildMessageExportFilenameBase,
    createExportDateMeta,
    loadExportRuntime,
} from '../utils/export/runtime';

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
            const filenameBase = buildMessageExportFilenameBase({
                messageId,
                markdownContent,
                sessionTitle,
                messageIndex,
            });

            const dateObj = new Date(message.timestamp);
            const { dateStr } = createExportDateMeta(dateObj);

            // Small delay to allow UI to update to "Exporting..." state
            if (type !== 'png') {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Find the rendered DOM bubble to preserve Math/Syntax/Diagrams
            // We use the data-message-id attribute which is present in the Message component
            const messageWrapper = document.querySelector(`[data-message-id="${message.id}"]`);
            // We want the inner bubble, usually inside the wrapper. 
            // The structure is Wrapper -> Container -> [Actions, Bubble, Actions]
            // We prioritize the new specific container class, falling back to older selectors if needed
            const contentNodeSource = messageWrapper?.querySelector('.message-content-container') || messageWrapper?.querySelector('.markdown-body') || messageWrapper?.querySelector('.shadow-sm');

            if (type === 'png' || type === 'html') {
                if (!contentNodeSource) {
                    throw new Error("Could not find message content in DOM. Please ensure the message is visible.");
                }

                const {
                    exportHtmlStringAsFile,
                    prepareElementForExport,
                    generateSnapshotPng,
                    buildHtmlDocument,
                } = await loadExportRuntime();

                // Use unified helper to clone, clean, and embed images
                // For PNG, we want expanded details visible. For HTML, we want them collapsed by default but interactive.
                const cleanedContent = await prepareElementForExport(contentNodeSource as HTMLElement, { expandDetails: type === 'png' });

                if (type === 'png') {
                    await generateSnapshotPng(
                        cleanedContent, 
                        `${filenameBase}.png`, 
                        themeId, 
                        {
                            title: "Exported Message",
                            metaLeft: dateStr,
                            metaRight: `ID: ${shortId}`
                        },
                        {
                            scale: 2.5 // Use slightly higher scale for single message clarity
                        }
                    );
                } else {
                    // Wrap the cleaned content
                    const wrapper = document.createElement('div');
                    wrapper.className = 'markdown-body';
                    wrapper.appendChild(cleanedContent);
                    const chatHtml = wrapper.outerHTML;

                    const fullHtml = await buildHtmlDocument({
                        title: `Message ${shortId}`,
                        date: dateStr,
                        model: `ID: ${shortId}`,
                        contentHtml: chatHtml,
                        themeId,
                        language: 'en',
                    });

                    exportHtmlStringAsFile(fullHtml, `${filenameBase}.html`);
                }

            } else if (type === 'txt') {
                const { exportTextStringAsFile, buildTextDocument } = await loadExportRuntime();
                const txtContent = buildTextDocument({
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
                const portableMessage = await serializeMessageForPortableExport(message);
                const blob = new Blob([JSON.stringify(portableMessage, null, 2)], { type: 'application/json' });
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
