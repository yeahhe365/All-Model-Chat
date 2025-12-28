
export const getDomain = (url: string) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

export const getFavicon = (url: string, title?: string) => {
    try {
        // Heuristic: If title looks like a domain (has dot, no spaces), use it.
        // This helps when the URI is a proxy/redirect (e.g. Vertex AI Search).
        if (title && title.includes('.') && !title.trim().includes(' ')) {
            return `https://www.google.com/s2/favicons?domain=${title.trim()}&sz=64`;
        }
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
        return null;
    }
};

export const insertCitations = (text: string, metadata: any): string => {
    if (!metadata || !metadata.groundingSupports) {
        return text;
    }

    // IMPORTANT: Do NOT sanitize text here. 
    // The indices in metadata.groundingSupports are byte offsets based on the RAW text returned by the API.
    const rawText = text;

    // Combine grounding chunks and citations into a single, indexed array
    const sources = [
        ...(metadata.groundingChunks?.map((c: any) => c.web) || []),
        ...(metadata.citations || []),
    ].filter(Boolean);

    if (sources.length === 0) return rawText;

    const encodedText = new TextEncoder().encode(rawText);
    const toCharIndex = (byteIndex: number) => {
        // Decode bytes up to byteIndex to find the corresponding character index in JS string
        return new TextDecoder().decode(encodedText.slice(0, byteIndex)).length;
    };

    const sortedSupports = [...metadata.groundingSupports].sort(
        (a: any, b: any) => (b.segment?.endIndex || 0) - (a.segment?.endIndex || 0)
    );

    let contentWithCitations = rawText;
    for (const support of sortedSupports) {
        const byteEndIndex = support.segment?.endIndex;
        if (typeof byteEndIndex !== 'number') continue;

        const charEndIndex = toCharIndex(byteEndIndex);
        const chunkIndices = support.groundingChunkIndices || [];

        const citationLinksHtml = chunkIndices
            .map((chunkIndex: number) => {
                if (chunkIndex >= sources.length) return '';
                const source = sources[chunkIndex];
                if (!source || !source.uri) return '';

                const titleAttr = `Source: ${source.title || source.uri}`.replace(/"/g, '&quot;');
                // Direct brackets in text for consistent coloring
                return `<a href="${source.uri}" target="_blank" rel="noopener noreferrer" class="citation-ref" title="${titleAttr}">[${chunkIndex + 1}]</a>`;
            })
            .join('');

        if (citationLinksHtml) {
            contentWithCitations =
                contentWithCitations.slice(0, charEndIndex) +
                citationLinksHtml +
                contentWithCitations.slice(charEndIndex);
        }
    }
    return contentWithCitations;
};

export const extractSources = (metadata: any) => {
    if (!metadata) return [];

    const uniqueSources = new Map<string, { uri: string; title: string }>();

    const addSource = (uri: string, title?: string) => {
        if (uri && !uniqueSources.has(uri)) {
            uniqueSources.set(uri, { uri, title: title || new URL(uri).hostname });
        }
    };

    if (metadata.groundingChunks && Array.isArray(metadata.groundingChunks)) {
        metadata.groundingChunks.forEach((chunk: any) => {
            if (chunk?.web?.uri) {
                addSource(chunk.web.uri, chunk.web.title);
            }
        });
    }

    if (metadata.citations && Array.isArray(metadata.citations)) {
        metadata.citations.forEach((citation: any) => {
            if (citation?.uri) {
                addSource(citation.uri, citation.title);
            }
        });
    }

    return Array.from(uniqueSources.values());
};
