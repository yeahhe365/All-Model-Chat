
import React, { useCallback } from 'react';
import { SavedChatSession, Theme } from '../../types';
import { logService, sanitizeSessionForExport } from '../../utils/appUtils';
import { 
    sanitizeFilename, 
    exportElementAsPng, 
    exportHtmlStringAsFile, 
    exportTextStringAsFile, 
    gatherPageStyles, 
    triggerDownload,
    generateExportHtmlTemplate,
    generateExportTxtTemplate,
    embedImagesInClone,
    createSnapshotContainer
} from '../../utils/exportUtils';
import DOMPurify from 'dompurify';

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
        
        const safeTitle = sanitizeFilename(activeChat.title);
        const dateObj = new Date();
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
        const isoDate = dateObj.toISOString().slice(0, 10);
        const filename = `chat-${safeTitle}-${isoDate}.${format}`;
        const scrollContainer = scrollContainerRef.current;

        if (format === 'png') {
            if (!scrollContainer) return;

            let cleanup = () => {};
            try {
                const { container, innerContent, remove, rootBgColor } = await createSnapshotContainer(
                    currentTheme.id,
                    '800px'
                );
                cleanup = remove;

                // Clone the chat container
                const chatClone = scrollContainer.cloneNode(true) as HTMLElement;
                
                // Pre-process the clone
                chatClone.querySelectorAll('details').forEach(details => {
                    details.setAttribute('open', '');
                });
                chatClone.querySelectorAll('.sticky').forEach(el => el.remove());
                chatClone.querySelectorAll('[data-message-id]').forEach(el => {
                    (el as HTMLElement).style.animation = 'none';
                    (el as HTMLElement).style.opacity = '1';
                    (el as HTMLElement).style.transform = 'none';
                });

                // Create header
                const headerHtml = `
                    <div style="padding: 2rem 2rem 1rem 2rem; border-bottom: 1px solid var(--theme-border-secondary); margin-bottom: 1rem;">
                        <h1 style="font-size: 1.5rem; font-weight: bold; color: var(--theme-text-primary); margin-bottom: 0.5rem;">${activeChat.title}</h1>
                        <div style="font-size: 0.875rem; color: var(--theme-text-tertiary); display: flex; gap: 1rem;">
                            <span>${dateStr}</span>
                            <span>•</span>
                            <span>${activeChat.settings.modelId}</span>
                        </div>
                    </div>
                `;

                innerContent.innerHTML = `
                    ${headerHtml}
                    <div style="padding: 0 2rem 2rem 2rem;">
                        ${chatClone.innerHTML}
                    </div>
                `;
                
                // Wait for rendering
                await new Promise(resolve => setTimeout(resolve, 800)); 

                await exportElementAsPng(container, filename, {
                    backgroundColor: rootBgColor,
                    scale: 2, 
                });

            } finally {
                cleanup();
            }
            return;
        }

        if (format === 'html') {
            if (!scrollContainer) return;

            // 1. Clone the container to avoid modifying the live UI
            const chatClone = scrollContainer.cloneNode(true) as HTMLElement;

            // 2. Clean UI elements that shouldn't be in the export
            const selectorsToRemove = [
                'button', 
                '.message-actions', 
                '.sticky', 
                'input', 
                'textarea', 
                '.code-block-utility-button',
                '[role="tooltip"]',
                '.loading-dots-container'
            ];
            chatClone.querySelectorAll(selectorsToRemove.join(',')).forEach(el => el.remove());
            
            // 3. Expand all details elements (thoughts) so they are visible in export
            chatClone.querySelectorAll('details').forEach(el => el.setAttribute('open', 'true'));

            // 4. Embed Images: Convert blob/url images to Base64 for self-contained HTML
            await embedImagesInClone(chatClone);

            // 5. Gather Styles & Generate Template
            const styles = await gatherPageStyles();
            const bodyClasses = document.body.className;
            const rootBgColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg-primary');
            const chatHtml = chatClone.innerHTML;

            const fullHtml = generateExportHtmlTemplate({
                title: DOMPurify.sanitize(activeChat.title),
                date: dateStr,
                model: activeChat.settings.modelId,
                contentHtml: chatHtml,
                styles,
                themeId: currentTheme.id,
                language,
                rootBgColor,
                bodyClasses
            });
            
            exportHtmlStringAsFile(fullHtml, filename);
        } else if (format === 'txt') {
            const txtContent = generateExportTxtTemplate({
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
