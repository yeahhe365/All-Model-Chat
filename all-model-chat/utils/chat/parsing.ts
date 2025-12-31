
export const parseThoughtProcess = (thoughts: string | undefined) => {
    if (!thoughts) return null;

    const lines = thoughts.trim().split('\n');
    let lastHeadingIndex = -1;
    let lastHeading = '';

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        // Check for ## or ### headings
        if (line.startsWith('## ') || line.startsWith('### ')) {
            lastHeadingIndex = i;
            lastHeading = line.replace(/^[#]+\s*/, '').trim();
            break;
        }
        // Check for lines that are entirely bolded (e.g., **Title**)
        if ((line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) || 
            (line.startsWith('__') && line.endsWith('__') && !line.slice(2, -2).includes('__'))) {
            lastHeadingIndex = i;
            // Remove the bold markers from the start and end
            lastHeading = line.substring(2, line.length - 2).trim();
            break;
        }
    }

    if (lastHeadingIndex === -1) {
            const content = lines.slice(-5).join('\n').trim();
            return { title: 'Latest thought', content, isFallback: true };
    }
    
    const contentLines = lines.slice(lastHeadingIndex + 1);
    const content = contentLines.filter(l => l.trim() !== '').join('\n').trim();

    return { title: lastHeading, content, isFallback: false };
};
