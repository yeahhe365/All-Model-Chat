import { formatExportDateTime, sanitizeFilename } from './core';
import { loadExportModules } from './loaders';

type ExportFileFormat = 'png' | 'html' | 'txt' | 'json';

interface BuildMessageExportFilenameBaseArgs {
  messageId: string;
  markdownContent: string;
  sessionTitle?: string;
  messageIndex?: number;
}

interface BuildChatExportFilenameArgs {
  title: string;
  format: ExportFileFormat;
  date?: Date;
}

interface BuildHtmlDocumentArgs {
  title: string;
  date: string;
  model: string;
  contentHtml: string;
  themeId: string;
  language: string;
}

interface BuildTextDocumentArgs {
  title: string;
  date: string;
  model: string;
  messages: Array<{
    role: string;
    timestamp: Date;
    content: string;
    files?: Array<{ name: string }>;
  }>;
}

export const createExportDateMeta = (date: Date) => ({
  dateStr: formatExportDateTime(date),
  isoDate: date.toISOString().slice(0, 10),
});

export const buildMessageExportFilenameBase = ({
  messageId,
  markdownContent,
  sessionTitle,
  messageIndex,
}: BuildMessageExportFilenameBaseArgs) => {
  const shortId = messageId.slice(-6);

  if (sessionTitle) {
    const safeTitle = sanitizeFilename(sessionTitle);
    const indexStr = messageIndex !== undefined ? `_msg_${messageIndex + 1}` : '';
    return `${safeTitle}${indexStr}`;
  }

  const contentSnippet = markdownContent.replace(/[^\w\s]/gi, '').split(' ').slice(0, 5).join('_');
  const safeSnippet = sanitizeFilename(contentSnippet) || 'message';
  return `${safeSnippet}-${shortId}`;
};

export const buildChatExportFilename = ({
  title,
  format,
  date = new Date(),
}: BuildChatExportFilenameArgs) => {
  const safeTitle = sanitizeFilename(title);
  const { isoDate } = createExportDateMeta(date);
  return `chat-${safeTitle}-${isoDate}.${format}`;
};

export const loadExportRuntime = async () => {
  const {
    exportHtmlStringAsFile,
    exportTextStringAsFile,
    gatherPageStyles,
    prepareElementForExport,
    generateSnapshotPng,
    generateExportHtmlTemplate,
    generateExportTxtTemplate,
  } = await loadExportModules();

  const buildHtmlDocument = async ({
    title,
    date,
    model,
    contentHtml,
    themeId,
    language,
  }: BuildHtmlDocumentArgs) => {
    const styles = await gatherPageStyles();
    const bodyClasses = document.body.className;
    const rootBgColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg-primary');

    return generateExportHtmlTemplate({
      title,
      date,
      model,
      contentHtml,
      styles,
      themeId,
      language,
      rootBgColor,
      bodyClasses,
    });
  };

  const buildTextDocument = ({ title, date, model, messages }: BuildTextDocumentArgs) =>
    generateExportTxtTemplate({
      title,
      date,
      model,
      messages,
    });

  return {
    exportHtmlStringAsFile,
    exportTextStringAsFile,
    prepareElementForExport,
    generateSnapshotPng,
    buildHtmlDocument,
    buildTextDocument,
  };
};
