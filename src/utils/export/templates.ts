export const generateExportHtmlTemplate = ({
    title,
    date,
    model,
    contentHtml,
    styles,
    themeId,
    language,
    rootBgColor,
    bodyClasses
}: {
    title: string,
    date: string,
    model: string,
    contentHtml: string,
    styles: string,
    themeId: string,
    language: string,
    rootBgColor: string,
    bodyClasses: string
}) => {
    return `
        <!DOCTYPE html>
        <html lang="${language}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Chat Export: ${title}</title>
            ${styles}
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    document.querySelectorAll('pre code').forEach((el) => {
                        if (window.hljs) {
                            window.hljs.highlightElement(el);
                        }
                    });
                });
            </script>
            <style>
                /* Reset & Layout */
                html, body { height: auto !important; overflow: auto !important; min-height: 100vh; }
                body { 
                    background-color: ${rootBgColor}; 
                    padding: 2rem; 
                    box-sizing: border-box; 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    color: var(--theme-text-primary, #333);
                }
                
                /* Container */
                .exported-chat-container {
                    width: 100%;
                    max-width: 900px;
                    margin: 0 auto;
                    background-color: transparent;
                }

                /* Header Styles */
                .exported-chat-header { 
                    padding-bottom: 1.5rem; 
                    border-bottom: 1px solid var(--theme-border-secondary, #e5e7eb); 
                    margin-bottom: 2rem; 
                }
                .exported-chat-title { 
                    font-size: 1.75rem; 
                    font-weight: 700; 
                    color: var(--theme-text-primary, inherit); 
                    margin: 0 0 0.5rem 0; 
                    line-height: 1.2;
                }
                .exported-chat-meta { 
                    font-size: 0.875rem; 
                    color: var(--theme-text-tertiary, #6b7280); 
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                }

                /* UI Cleanup - Hide interactive elements */
                .message-actions, 
                .code-block-utility-button, 
                button, 
                .sticky,
                [role="tooltip"],
                input,
                textarea { 
                    display: none !important; 
                }

                /* Message Styling Fixes */
                .group.relative.message-container-animate { 
                    animation: none !important; 
                    opacity: 1 !important; 
                    transform: none !important; 
                    margin-bottom: 1.5rem;
                }
                
                /* Links */
                a { color: var(--theme-text-link, #2563eb); text-decoration: none; }
                a:hover { text-decoration: underline; }

                /* Tables */
                table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                th, td { 
                    border: 1px solid var(--theme-border-secondary, #e5e5e5); 
                    padding: 0.5rem 0.75rem; 
                    text-align: left; 
                }
                th { background-color: var(--theme-bg-tertiary, #f3f4f6); font-weight: 600; }

                /* Code Blocks */
                pre { 
                    background-color: var(--theme-bg-code-block, #f3f4f6); 
                    border-radius: 0.5rem; 
                    padding: 1rem; 
                    overflow-x: auto; 
                }
            </style>
        </head>
        <body class="${bodyClasses} theme-${themeId} is-exporting-png">
            <div class="exported-chat-container">
                <div class="exported-chat-header">
                    <h1 class="exported-chat-title">${title}</h1>
                    <div class="exported-chat-meta">
                        <span>${date}</span> • <span>${model}</span>
                    </div>
                </div>
                ${contentHtml}
            </div>
        </body>
        </html>
    `;
};

export const generateExportTxtTemplate = ({
    title,
    date,
    model,
    messages
}: {
    title: string,
    date: string,
    model: string,
    messages: Array<{ role: string, timestamp: Date, content: string, files?: Array<{name: string}> }>
}) => {
    const separator = '-'.repeat(40);
    
    const header = [
        `Chat: ${title}`,
        `Date: ${date}`,
        `Model: ${model}`,
        '='.repeat(40),
        ''
    ].join('\n');

    const body = messages.map(msg => {
        const roleTitle = msg.role.toUpperCase();
        const timeStr = new Date(msg.timestamp).toLocaleString();
        let text = `### ${roleTitle} [${timeStr}]\n`;
        
        if (msg.files && msg.files.length > 0) {
            msg.files.forEach(f => {
                text += `[Attachment: ${f.name}]\n`;
            });
        }
        
        text += msg.content;
        return text;
    }).join(`\n\n${separator}\n\n`);

    return header + body;
};