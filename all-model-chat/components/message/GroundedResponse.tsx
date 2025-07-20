import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { CodeBlock } from './CodeBlock';

interface GroundedResponseProps {
  text: string;
  metadata: any;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  expandCodeBlocksByDefault: boolean;
}

export const GroundedResponse: React.FC<GroundedResponseProps> = ({ text, metadata, onOpenHtmlPreview, expandCodeBlocksByDefault }) => {
  const content = useMemo(() => {
    if (!metadata || !metadata.groundingSupports) {
      return text;
    }
  
    // Combine grounding chunks and citations into a single, indexed array
    const sources = [
      ...(metadata.groundingChunks?.map((c: any) => c.web) || []),
      ...(metadata.citations || []),
    ].filter(Boolean);

    if(sources.length === 0) return text;
  
    const encodedText = new TextEncoder().encode(text);
    const toCharIndex = (byteIndex: number) => {
      return new TextDecoder().decode(encodedText.slice(0, byteIndex)).length;
    };
  
    const sortedSupports = [...metadata.groundingSupports].sort(
      (a: any, b: any) => (b.segment?.endIndex || 0) - (a.segment?.endIndex || 0)
    );
  
    let contentWithCitations = text;
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

  const components = useMemo(() => ({
    pre: (props: any) => {
      const { node, children, ...rest } = props;
      const codeElement = React.Children.toArray(children).find(
        (child: any) => child.type === 'code'
      ) as React.ReactElement | undefined;
      const codeClassName = codeElement?.props?.className || '';
      return (
        <CodeBlock 
          {...rest} 
          className={codeClassName} 
          onOpenHtmlPreview={onOpenHtmlPreview} 
          expandCodeBlocksByDefault={expandCodeBlocksByDefault}
        >
          {children}
        </CodeBlock>
      );
    }
  }), [onOpenHtmlPreview, expandCodeBlocksByDefault]);

  return (
    <div>
      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
          components={components}
        >
          {content}
        </ReactMarkdown>
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
