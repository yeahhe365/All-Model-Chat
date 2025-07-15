import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { CodeBlock } from './CodeBlock';

interface GroundedResponseProps {
  text: string;
  metadata: any;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
}

export const GroundedResponse: React.FC<GroundedResponseProps> = ({ text, metadata, onOpenHtmlPreview }) => {
  const content = useMemo(() => {
    if (!metadata || !metadata.groundingChunks || !metadata.groundingSupports) {
      return text;
    }

    const { groundingChunks, groundingSupports } = metadata;

    const encodedText = new TextEncoder().encode(text);
    const toCharIndex = (byteIndex: number) => {
        // Create a subarray of the encoded bytes and decode it back to a string.
        // The length of the resulting string is the correct character index.
        return new TextDecoder().decode(encodedText.slice(0, byteIndex)).length;
    };

    // Sort supports by end index in descending order to make insertions from end to start
    // without invalidating indices of earlier parts of the string.
    const sortedSupports = [...groundingSupports].sort(
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
          if (chunkIndex >= groundingChunks.length) return '';
          const source = groundingChunks[chunkIndex]?.web;
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

  const components = useMemo(() => ({
    pre: (props: any) => {
      const { node, ...rest } = props;
      const children = (props.children[0] && props.children[0].type === 'code') ? props.children[0] : props.children;
      return <CodeBlock {...rest} onOpenHtmlPreview={onOpenHtmlPreview}>{children}</CodeBlock>;
    }
  }), [onOpenHtmlPreview]);

  return (
    <div>
      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeHighlight]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
      {metadata?.groundingChunks?.length > 0 && (
        <div className="grounded-response-sources border-t border-[var(--theme-border-secondary)] pt-2 mt-3">
          <h4 className="text-xs font-semibold uppercase text-[var(--theme-text-tertiary)] tracking-wider">Sources</h4>
          <ol>
            {metadata.groundingChunks.map((chunk: any, i: number) => {
                const source = chunk.web;
                if (!source || !source.uri) return null;
                // Fallback to hostname if title is missing
                const linkText = source.title || new URL(source.uri).hostname;
                return (
                  <li key={`source-${i}`}>
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" title={source.uri}>
                      {linkText}
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