
import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { UploadedFile } from '../../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { translations } from '../../utils/appUtils';
import { Globe, ExternalLink, Search, Link as LinkIcon, AlertTriangle, CheckCircle } from 'lucide-react';

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
}

const GoogleGIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 0, 0)">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </g>
  </svg>
);

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

export const GroundedResponse: React.FC<GroundedResponseProps> = ({ text, metadata, urlContextMetadata, isLoading, onOpenHtmlPreview, expandCodeBlocksByDefault, onImageClick, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, t, themeId }) => {
  const content = useMemo(() => {
    if (!metadata || !metadata.groundingSupports) {
      return text;
    }
  
    // Sanitize the raw text from the model before injecting our own HTML for citations.
    const sanitizedText = DOMPurify.sanitize(text, { FORBID_TAGS: ['iframe', 'script', 'style', 'video', 'audio'] });

    // Combine grounding chunks and citations into a single, indexed array
    const sources = [
      ...(metadata.groundingChunks?.map((c: any) => c.web) || []),
      ...(metadata.citations || []),
    ].filter(Boolean);

    if(sources.length === 0) return sanitizedText;
  
    const encodedText = new TextEncoder().encode(sanitizedText);
    const toCharIndex = (byteIndex: number) => {
      return new TextDecoder().decode(encodedText.slice(0, byteIndex)).length;
    };
  
    const sortedSupports = [...metadata.groundingSupports].sort(
      (a: any, b: any) => (b.segment?.endIndex || 0) - (a.segment?.endIndex || 0)
    );
  
    let contentWithCitations = sanitizedText;
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
                <GoogleGIcon />
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
