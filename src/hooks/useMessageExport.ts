import { useState } from 'react';
import { ChatMessage } from '../types';
import { serializeMessageForPortableExport } from '../utils/chat/session';
import { createManagedObjectUrl } from '../services/objectUrlManager';
import { triggerDownload } from '../utils/export/core';
import { buildMessageExportFilenameBase, createExportDateMeta, loadExportRuntime } from '../utils/export/runtime';
import { useI18n } from '../contexts/I18nContext';

interface UseMessageExportProps {
  message: ChatMessage;
  sessionTitle?: string;
  messageIndex?: number;
  themeId: string;
}

export type ExportType = 'png' | 'html' | 'txt' | 'json';

export const useMessageExport = ({ message, sessionTitle, messageIndex, themeId }: UseMessageExportProps) => {
  const { language, t } = useI18n();
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
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Find the rendered DOM bubble to preserve Math/Syntax/Diagrams
      // We use the data-message-id attribute which is present in the Message component
      const messageWrapper = document.querySelector(`[data-message-id="${message.id}"]`);
      // We want the inner bubble, usually inside the wrapper.
      // The structure is Wrapper -> Container -> [Actions, Bubble, Actions]
      // We prioritize the new specific container class, falling back to older selectors if needed
      const contentNodeSource =
        messageWrapper?.querySelector('.message-content-container') ||
        messageWrapper?.querySelector('.markdown-body') ||
        messageWrapper?.querySelector('.shadow-sm');

      if (type === 'png' || type === 'html') {
        if (!contentNodeSource) {
          throw new Error(t('export_message_content_missing'));
        }

        const { exportHtmlStringAsFile, prepareElementForExport, generateSnapshotPng, buildHtmlDocument } =
          await loadExportRuntime();

        // Use unified helper to clone, clean, and embed images
        // For PNG, we want expanded details visible. For HTML, we want them collapsed by default but interactive.
        const cleanedContent = await prepareElementForExport(contentNodeSource as HTMLElement, {
          expandDetails: type === 'png',
        });

        if (type === 'png') {
          const didExport = await generateSnapshotPng(
            cleanedContent,
            `${filenameBase}.png`,
            themeId,
            {
              title: t('export_message_title'),
              metaLeft: dateStr,
              metaRight: t('export_message_id').replace('{id}', shortId),
            },
            {
              scale: 2.5, // Use slightly higher scale for single message clarity
              messages: {
                imageTooLarge: t('export_image_too_large'),
                exportFailed: (message) => t('export_failed_with_message').replace('{message}', message),
              },
            },
          );
          if (didExport === false) {
            return;
          }
        } else {
          // Wrap the cleaned content
          const wrapper = document.createElement('div');
          wrapper.className = 'markdown-body';
          wrapper.appendChild(cleanedContent);
          const chatHtml = wrapper.outerHTML;

          const fullHtml = await buildHtmlDocument({
            title: t('export_message_html_title').replace('{id}', shortId),
            date: dateStr,
            model: t('export_message_id').replace('{id}', shortId),
            contentHtml: chatHtml,
            themeId,
            language,
          });

          exportHtmlStringAsFile(fullHtml, `${filenameBase}.html`);
        }
      } else if (type === 'txt') {
        const { exportTextStringAsFile, buildTextDocument } = await loadExportRuntime();
        const txtContent = buildTextDocument({
          title: t('export_message_text_title').replace('{id}', shortId),
          date: dateStr,
          model: t('export_not_applicable'),
          messages: [
            {
              role: message.role === 'user' ? t('export_role_user') : t('export_role_assistant'),
              timestamp: new Date(message.timestamp),
              content: markdownContent,
              files: message.files?.map((f) => ({ name: f.name })),
            },
          ],
        });
        exportTextStringAsFile(txtContent, `${filenameBase}.txt`);
      } else if (type === 'json') {
        const portableMessage = await serializeMessageForPortableExport(message);
        const blob = new Blob([JSON.stringify(portableMessage, null, 2)], { type: 'application/json' });
        triggerDownload(createManagedObjectUrl(blob), `${filenameBase}.json`);
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(`Failed to export message as ${type.toUpperCase()}:`, err);
      alert(t('export_failed_with_message').replace('{message}', err instanceof Error ? err.message : String(err)));
    } finally {
      setExportingType(null);
    }
  };

  return {
    exportingType,
    handleExport,
  };
};
