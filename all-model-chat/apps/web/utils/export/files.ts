import { triggerDownload } from './core';

/**
 * Exports a string of HTML content as an .html file.
 * @param htmlContent The full HTML document string.
 * @param filename The desired filename.
 */
export const exportHtmlStringAsFile = (htmlContent: string, filename:string) => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    triggerDownload(URL.createObjectURL(blob), filename);
};

/**
 * Exports a string of text content as a .txt file.
 * @param textContent The text content to save.
 * @param filename The desired filename.
 */
export const exportTextStringAsFile = (textContent: string, filename: string) => {
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    triggerDownload(URL.createObjectURL(blob), filename);
};