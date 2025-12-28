
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
});

// Use GitHub Flavored Markdown plugin (tables, task lists, etc.)
turndownService.use(gfm);

// Remove scripts, styles, and other non-content elements
turndownService.remove(['script', 'style', 'noscript', 'iframe', 'object', 'applet', 'video', 'audio']);

export const convertHtmlToMarkdown = (html: string): string => {
    try {
        return turndownService.turndown(html);
    } catch (e) {
        console.error("Failed to convert HTML to Markdown:", e);
        return "";
    }
};
