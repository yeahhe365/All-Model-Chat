import type React from 'react';
import { useCallback } from 'react';
import { type SavedChatSession, type Theme } from '@/types';
import { logService } from '@/services/logService';
import { createManagedObjectUrl } from '@/services/objectUrlManager';
import { serializeSessionForPortableExport } from '@/utils/chat/session';
import { triggerDownload } from '@/utils/export/core';
import { createChatExportElement } from '@/utils/export/conversation';
import { buildChatExportFilename, createExportDateMeta, loadExportRuntime } from '@/utils/export/runtime';

interface UseChatSessionExportProps {
  activeChat: SavedChatSession | undefined;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  currentTheme: Theme;
  language: 'en' | 'zh';
  t: (key: string) => string;
}

export const useChatSessionExport = ({ activeChat, currentTheme, language, t }: UseChatSessionExportProps) => {
  const exportChatLogic = useCallback(
    async (format: 'png' | 'html' | 'txt' | 'json'): Promise<boolean> => {
      if (!activeChat) return false;
      const dateObj = new Date();
      const { dateStr } = createExportDateMeta(dateObj);
      const filename = buildChatExportFilename({
        title: activeChat.title,
        format,
        date: dateObj,
      });
      if (format === 'png' || format === 'html') {
        const { exportHtmlStringAsFile, prepareElementForExport, generateSnapshotPng, buildHtmlDocument } =
          await loadExportRuntime();

        // Use unified helper to clone, clean, and embed images.
        // For PNG, force expand details to ensure visibility in static image.
        // For HTML, allow details to be collapsed by default (interactive).
        const { element: exportElement, cleanup } = await createChatExportElement(activeChat, currentTheme.id);
        const chatClone = await prepareElementForExport(exportElement, { expandDetails: format === 'png' });

        try {
          if (format === 'png') {
            const didExport = await generateSnapshotPng(
              chatClone,
              filename,
              currentTheme.id,
              {
                title: activeChat.title,
                metaLeft: dateStr,
                metaRight: activeChat.settings.modelId,
              },
              {
                scale: 2, // Standard 2x scale for full chat
                messages: {
                  imageTooLarge: t('export_image_too_large'),
                  exportFailed: (message) => t('export_failed_with_message').replace('{message}', message),
                },
              },
            );
            if (didExport === false) {
              return false;
            }
          } else {
            // HTML Export
            const chatHtml = chatClone.innerHTML;

            const fullHtml = await buildHtmlDocument({
              title: activeChat.title,
              date: dateStr,
              model: activeChat.settings.modelId,
              contentHtml: chatHtml,
              themeId: currentTheme.id,
              language,
            });

            exportHtmlStringAsFile(fullHtml, filename);
          }
        } finally {
          cleanup();
        }
      } else if (format === 'txt') {
        const { exportTextStringAsFile, buildTextDocument } = await loadExportRuntime();
        const txtContent = buildTextDocument({
          title: activeChat.title,
          date: dateStr,
          model: activeChat.settings.modelId,
          messages: activeChat.messages.map((m) => ({
            role: m.role === 'user' ? t('export_role_user') : t('export_role_assistant'),
            timestamp: m.timestamp,
            content: m.content,
            files: m.files?.map((f) => ({ name: f.name })),
          })),
        });

        exportTextStringAsFile(txtContent, filename);
      } else if (format === 'json') {
        logService.info(`Exporting chat ${activeChat.id} as JSON.`);
        try {
          // Sanitize the session before export to remove non-serializable blobs
          const sanitizedChat = await serializeSessionForPortableExport(activeChat);

          // We create a structure compatible with the history import feature
          const dataToExport = {
            type: 'AllModelChat-History',
            version: 1,
            history: [sanitizedChat], // Exporting only the active chat session
            groups: [], // No groups are exported with a single chat
          };
          const jsonString = JSON.stringify(dataToExport, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          triggerDownload(createManagedObjectUrl(blob), filename);
        } catch (error) {
          logService.error('Failed to export chat as JSON', { error });
          alert(t('export_failed_title'));
          return false;
        }
      }
      return true;
    },
    [activeChat, currentTheme, language, t],
  );

  return { exportChatLogic };
};
