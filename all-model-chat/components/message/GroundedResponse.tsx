import React from 'react';

interface GroundedResponseProps {
  text: string;
  metadata: any;
}

export const GroundedResponse: React.FC<GroundedResponseProps> = ({ text, metadata }) => {
  if (!metadata || !metadata.groundingChunks || !metadata.groundingSupports) {
    return <div className="markdown-body"><p>{text}</p></div>;
  }

  const { groundingChunks, groundingSupports } = metadata;
  
  const sortedSupports = [...groundingSupports].sort(
    (a: any, b: any) => (a.segment?.startIndex || 0) - (b.segment?.startIndex || 0)
  );

  let lastIndex = 0;
  const parts: (string | JSX.Element)[] = [];

  sortedSupports.forEach((support: any, i: number) => {
    const startIndex = support.segment?.startIndex || 0;
    const endIndex = support.segment?.endIndex || 0;
    const chunkIndices = support.groundingChunkIndices || [];

    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }

    const citedText = text.substring(startIndex, endIndex);
    
    parts.push(
      <span key={`citation-${i}`}>
        {citedText}
        {chunkIndices.map((chunkIndex: number) => {
            const source = groundingChunks[chunkIndex]?.web;
            if (!source || !source.uri) return null;
            return (
                <a 
                  key={`source-link-${i}-${chunkIndex}`}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="citation-source-link"
                  title={`Source: ${source.title || source.uri}`}
                >
                  {chunkIndex + 1}
                </a>
            )
        })}
      </span>
    );

    lastIndex = endIndex;
  });

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return (
    <div>
      <div className="markdown-body" style={{ marginBottom: '1rem', lineHeight: '1.75', fontSize: '1rem' }}>{parts}</div>
      {groundingChunks.length > 0 && (
        <div className="grounded-response-sources border-t border-[var(--theme-border-secondary)] pt-2 mt-3">
          <h4 className="text-xs font-semibold uppercase text-[var(--theme-text-tertiary)] tracking-wider">Sources</h4>
          <ol>
            {groundingChunks.map((chunk: any, i: number) => {
                const source = chunk.web;
                if (!source || !source.uri) return null;
                return (
                  <li key={`source-${i}`}>
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" title={source.uri}>
                      {source.title || source.uri}
                    </a>
                  </li>
                )
            })}
          </ol>
        </div>
      )}
    </div>
  );
};