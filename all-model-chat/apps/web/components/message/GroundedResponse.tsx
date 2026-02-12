
import React, { useMemo } from 'react';
import { UploadedFile, SideViewContent } from '../../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { translations } from '../../utils/appUtils';
import { insertCitations, extractSources } from './grounded-response/utils';
import { SearchQueries } from './grounded-response/SearchQueries';
import { ContextUrls } from './grounded-response/ContextUrls';
import { SearchSources } from './grounded-response/SearchSources';

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

export const GroundedResponse: React.FC<GroundedResponseProps> = ({ 
    text, 
    metadata, 
    urlContextMetadata, 
    isLoading, 
    onOpenHtmlPreview, 
    expandCodeBlocksByDefault, 
    onImageClick, 
    isMermaidRenderingEnabled, 
    isGraphvizRenderingEnabled, 
    t, 
    themeId, 
    onOpenSidePanel 
}) => {
  
  const content = useMemo(() => insertCitations(text, metadata), [text, metadata]);
  const sources = useMemo(() => extractSources(metadata), [metadata]);
  const searchQueries = useMemo(() => metadata?.webSearchQueries || [], [metadata]);

  return (
    <div className="space-y-4">
      {/* Search Queries (Pill Style) */}
      <SearchQueries queries={searchQueries} />

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
      
      {/* URL Context Metadata */}
      <ContextUrls metadata={urlContextMetadata} />

      {/* Sources List (Search Grounding) */}
      <SearchSources sources={sources} />
    </div>
  );
};
