
import React, { useMemo } from 'react';
import { UploadedFile, SideViewContent } from '../../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { translations } from '../../utils/appUtils';
import { Globe, ExternalLink, Search, Link as LinkIcon, AlertTriangle, CheckCircle } from 'lucide-react';
import { IconGoogle } from '../icons/CustomIcons';

interface GroundedResponseProps {
  text: string;
  metadata: any;
  urlContextMetadata?: any;
  isLoading: boolean;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  expandCodeBlocksByDefault: boolean;
  onImageClick: (file: UploadedFile) => void;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  t: (key: keyof typeof translations) => string;
  themeId: string;
  onOpenSidePanel: (content: SideViewContent) => void;
}

const getDomain = (url: string) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

const getFavicon = (url: string, title?: string) => {
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

interface UrlContextItem {
    retrievedUrl?: string;
    retrieved_url?: string;
    urlRetrievalStatus?: string;
    url_retrieval_status?: string;
}

export const GroundedResponse: React.FC<GroundedResponseProps> = ({ text, metadata, urlContextMetadata, isLoading, onOpenHtmlPreview, expandCodeBlocksByDefault, onImageClick, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, t, themeId, onOpenSidePanel }) => {
  const content = useMemo(() => {
    if (!metadata || !metadata.groundingSupports) {
      return text;
    }
  
    // IMPORTANT: Do NOT sanitize text here. 
    // The indices in metadata.groundingSupports are byte offsets based on the RAW text returned by the API.
    // If we sanitize here (e.g. DOMPurify), the string length/content changes, and indices will drift,
    // causing citations to be inserted at the wrong positions or crashing the slice operation.
    // Security is handled downstream by MarkdownRenderer which uses rehype-sanitize.
    const rawText = text;

    // Combine grounding chunks and citations into a single, indexed array
    const sources = [
      ...(metadata.groundingChunks?.map((c: any) => c.web) || []),
      ...(metadata.citations || []),
    ].filter(Boolean);

    if(sources.length === 0) return rawText;
  
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
  }, [text, metadata]);
  
  const sources = useMemo(() => {
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
  }, [metadata]);

  const urlContextItems = useMemo<UrlContextItem[]>(() => {
      // Handle both snake_case and camelCase
      return (urlContextMetadata?.urlMetadata || urlContextMetadata?.url_metadata || []) as UrlContextItem[];
  }, [urlContextMetadata]);

  const searchQueries = useMemo(() => {
    return metadata?.webSearchQueries || [];
  }, [metadata]);

  const getStatusIcon = (status?: string) => {
      const s = status?.toUpperCase();
      if (s === 'URL_RETRIEVAL_STATUS_SUCCESS' || s === 'SUCCESS') return <CheckCircle size={12} className="text-green-500" />;
      if (s === 'URL_RETRIEVAL_STATUS_UNSAFE' || s === 'UNSAFE') return <AlertTriangle size={12} className="text-red-500" />;
      if (s === 'URL_RETRIEVAL_STATUS_FAILED' || s === 'FAILED') return <AlertTriangle size={12} className="text-orange-500" />;
      return <Globe size={12} className="text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Search Queries (Pill Style) */}
      {searchQueries.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar select-none">
            <div className="flex-shrink-0 pt-0.5">
                <IconGoogle size={18} />
            </div>
            <div className="flex items-center gap-2">
                {searchQueries.map((q: string, i: number) => (
                    <a
                        key={i}
                        href={`https://www.google.com/search?q=${encodeURIComponent(q)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 px-3 py-1.5 rounded-full border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/50 text-[13px] font-medium text-[var(--theme-text-primary)] whitespace-nowrap shadow-sm hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-link)] hover:border-[var(--theme-border-focus)] transition-all cursor-pointer no-underline"
                        title={`Search for "${q}"`}
                    >
                        {q}
                    </a>
                ))}
            </div>
        </div>
      )}

      {/* Main Content */}
      <div className="markdown-body">
        <MarkdownRenderer
          content={content}
          isLoading={isLoading}
          onImageClick={onImageClick}
          onOpenHtmlPreview={onOpenHtmlPreview}
          expandCodeBlocksByDefault={expandCodeBlocksByDefault}
          isMermaidRenderingEnabled={isMermaidRenderingEnabled}
          isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
          allowHtml={true}
          t={t}
          themeId={themeId}
          onOpenSidePanel={onOpenSidePanel}
        />
      </div>
      
      {/* URL Context Metadata (New Section) */}
      {urlContextItems.length > 0 && (
        <div className="mt-3 pt-2 border-t border-[var(--theme-border-secondary)]/30 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2 mb-2">
                <LinkIcon size={11} className="text-[var(--theme-text-tertiary)]" strokeWidth={2} />
                <h4 className="text-[10px] font-bold uppercase text-[var(--theme-text-tertiary)] tracking-widest">Context URLs</h4>
            </div>
            <div className="flex flex-wrap gap-2">
                {urlContextItems.map((item, i) => {
                    const url = item.retrievedUrl || item.retrieved_url || '';
                    const status = item.urlRetrievalStatus || item.url_retrieval_status;
                    if (!url) return null;
                    
                    return (
                        <a 
                            key={`context-${i}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--theme-bg-tertiary)]/20 hover:bg-[var(--theme-bg-tertiary)]/60 border border-[var(--theme-border-secondary)]/30 hover:border-[var(--theme-border-secondary)] transition-all no-underline group max-w-full"
                            title={`Status: ${status}`}
                        >
                            <div className="flex-shrink-0 pt-0.5">
                                {getStatusIcon(status)}
                            </div>
                            <span className="text-xs font-mono text-[var(--theme-text-secondary)] truncate group-hover:text-[var(--theme-text-primary)]">
                                {getDomain(url)}
                            </span>
                        </a>
                    );
                })}
            </div>
        </div>
      )}

      {/* Sources List (Search Grounding) */}
      {sources.length > 0 && (
        <div className="mt-3 pt-2 border-t border-[var(--theme-border-secondary)]/30 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 mb-2">
              <Globe size={11} className="text-[var(--theme-text-tertiary)]" strokeWidth={2} />
              <h4 className="text-[10px] font-bold uppercase text-[var(--theme-text-tertiary)] tracking-widest">Sources</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {sources.map((source, i) => {
                const favicon = getFavicon(source.uri, source.title);
                return (
                  <a 
                    key={`source-${i}`}
                    href={source.uri}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--theme-bg-tertiary)]/20 hover:bg-[var(--theme-bg-tertiary)]/60 border border-[var(--theme-border-secondary)]/30 hover:border-[var(--theme-border-secondary)] transition-all group no-underline"
                    title={source.title}
                  >
                    <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-sm bg-white/90 overflow-hidden shadow-sm ring-1 ring-black/5">
                        {favicon ? (
                            <img 
                                src={favicon} 
                                alt="" 
                                className="w-full h-full object-contain" 
                                onError={(e) => {
                                    e.currentTarget.style.display='none'; 
                                    e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                                }} 
                            />
                        ) : null}
                        <Globe size={10} className={`fallback-icon text-neutral-400 ${favicon ? 'hidden' : ''}`} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium text-[var(--theme-text-primary)] truncate leading-tight group-hover:text-[var(--theme-text-link)] transition-colors">
                            {source.title || "Web Source"}
                        </div>
                        <div className="text-[9px] text-[var(--theme-text-tertiary)] truncate opacity-70 leading-none mt-0.5">
                            {getDomain(source.uri)}
                        </div>
                    </div>
                    <div className="text-[9px] font-mono font-medium text-[var(--theme-text-tertiary)] opacity-40 group-hover:opacity-100 transition-opacity">
                        {i + 1}
                    </div>
                  </a>
                );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
