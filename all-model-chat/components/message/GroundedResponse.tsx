
import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { UploadedFile } from '../../types';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import { translations } from '../../utils/appUtils';

interface GroundedResponseProps {
  text: string;
  metadata: any;
  isLoading: boolean;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  expandCodeBlocksByDefault: boolean;
  onImageClick: (file: UploadedFile) => void;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  t: (key: keyof typeof translations) => string;
}

export const GroundedResponse: React.FC<GroundedResponseProps> = ({ text, metadata, isLoading, onOpenHtmlPreview, expandCodeBlocksByDefault, onImageClick, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, t }) => {
  const content = useMemo(() => {
    if (!metadata || !metadata.groundingSupports) {
      return text;
    }
  
    // Sanitize the raw text from the model before injecting our own HTML for citations.
    // This prevents unsafe tags like <iframe> or <script> from being rendered.
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
          return `<a href="${source.uri}" target="_blank" rel="noopener noreferrer" class="citation-source-link" title="${titleAttr}">${chunkIndex + 1}</a>`;
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

  return (
    <div>
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
        />
      </div>
      {sources.length > 0 && (
        <div className="grounded-response-sources border-t border-[var(--theme-border-secondary)] pt-2 mt-3">
          <h4 className="text-xs font-semibold uppercase text-[var(--theme-text-tertiary)] tracking-wider">Sources</h4>
          <ol>
            {sources.map((source, i: number) => {
                return (
                  <li key={`source-${i}`}>
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" title={source.uri}>
                      {source.title}
                    </a>
                  </li>
                );
            })}
          </ol>
        </div>
      )}
    </div>
  );
};
