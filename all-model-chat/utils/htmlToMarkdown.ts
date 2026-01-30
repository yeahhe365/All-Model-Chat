
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

// Custom rule for KaTeX Math
turndownService.addRule('katex', {
    filter: (node) => {
        return node.nodeName === 'SPAN' && node.classList.contains('katex');
    },
    replacement: (content, node) => {
        // Try to find the source annotation inside the MathML block
        const annotation = node.querySelector('annotation[encoding="application/x-tex"]');
        if (annotation) {
            const latex = annotation.textContent || '';
            // Determine if it is display mode (block) or inline
            // KaTeX often adds 'katex-display' class to the wrapper or specific elements for block math
            const isDisplay = node.classList.contains('katex-display') || 
                              node.querySelector('.katex-display') !== null;
            
            return isDisplay ? `$$ ${latex} $$` : `$${latex}$`;
        }
        return content;
    }
});

export const convertHtmlToMarkdown = (html: string): string => {
    try {
        return turndownService.turndown(html);
    } catch (e) {
        console.error("Failed to convert HTML to Markdown:", e);
        return "";
    }
};
