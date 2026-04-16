

import React, { useCallback } from 'react';
import { SavedChatSession, Theme } from '../../types';
import { logService, sanitizeSessionForExport } from '../../utils/appUtils';
import { triggerDownload } from '../../utils/export/core';
import {
    buildChatExportFilename,
    createExportDateMeta,
    loadExportRuntime,
} from '../../utils/export/runtime';

interface UseChatSessionExportProps {
    activeChat: SavedChatSession | undefined;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    currentTheme: Theme;
    language: 'en' | 'zh';
    t: (key: string) => string;
}

export const useChatSessionExport = ({
    activeChat,
    scrollContainerRef,
    currentTheme,
    language,
    t
}: UseChatSessionExportProps) => {

    const exportChatLogic = useCallback(async (format: 'png' | 'html' | 'txt' | 'json') => {
        if (!activeChat) return;
        const dateObj = new Date();
        const { dateStr } = createExportDateMeta(dateObj);
        const filename = buildChatExportFilename({
            title: activeChat.title,
            format,
            date: dateObj,
        });
        const scrollContainer = scrollContainerRef.current;

        if (format === 'png' || format === 'html') {
            if (!scrollContainer) return;

            const {
                exportHtmlStringAsFile,
                prepareElementForExport,
                generateSnapshotPng,
                buildHtmlDocument,
            } = await loadExportRuntime();

            // Use unified helper to clone, clean, and embed images.
            // For PNG, force expand details to ensure visibility in static image.
            // For HTML, allow details to be collapsed by default (interactive).
            const chatClone = await prepareElementForExport(scrollContainer, { expandDetails: format === 'png' });

            if (format === 'png') {
                await generateSnapshotPng(
                    chatClone,
                    filename,
                    currentTheme.id,
                    {
                        title: activeChat.title,
                        metaLeft: dateStr,
                        metaRight: activeChat.settings.modelId
                    },
                    {
                        scale: 2 // Standard 2x scale for full chat
                    }
                );
            } else {
                // HTML Export
                const { default: DOMPurify } = await import('dompurify');
                const chatHtml = chatClone.innerHTML;

                const fullHtml = await buildHtmlDocument({
                    title: DOMPurify.sanitize(activeChat.title),
                    date: dateStr,
                    model: activeChat.settings.modelId,
                    contentHtml: chatHtml,
                    themeId: currentTheme.id,
                    language,
                });
                
                exportHtmlStringAsFile(fullHtml, filename);
            }
        } else if (format === 'txt') {
            const { exportTextStringAsFile, buildTextDocument } = await loadExportRuntime();
            const txtContent = buildTextDocument({
                title: activeChat.title,
                date: dateStr,
                model: activeChat.settings.modelId,
                messages: activeChat.messages.map(m => ({
                    role: m.role === 'user' ? 'USER' : 'ASSISTANT',
                    timestamp: m.timestamp,
                    content: m.content,
                    files: m.files?.map(f => ({ name: f.name }))
                }))
            });

            exportTextStringAsFile(txtContent, filename);
        } else if (format === 'json') {
            logService.info(`Exporting chat ${activeChat.id} as JSON.`);
            try {
                // Sanitize the session before export to remove non-serializable blobs
                const sanitizedChat = sanitizeSessionForExport(activeChat);
                
                // We create a structure compatible with the history import feature
                const dataToExport = {
                    type: 'AllModelChat-History',
                    version: 1,
                    history: [sanitizedChat], // Exporting only the active chat session
                    groups: [], // No groups are exported with a single chat
                };
                const jsonString = JSON.stringify(dataToExport, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                triggerDownload(URL.createObjectURL(blob), filename);
            } catch (error) {
                logService.error('Failed to export chat as JSON', { error });
                alert(t('export_failed_title'));
            }
        }
    }, [activeChat, currentTheme, language, scrollContainerRef, t]);

    return { exportChatLogic };
};
