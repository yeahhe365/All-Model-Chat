import React, { useMemo } from 'react';
import { Link as LinkIcon, AlertTriangle, CheckCircle, Globe } from 'lucide-react';
import { getDomain } from './utils';
import { useI18n } from '../../../contexts/I18nContext';

interface UrlContextItem {
  retrievedUrl?: string;
  retrieved_url?: string;
  urlRetrievalStatus?: string;
  url_retrieval_status?: string;
}

interface ContextUrlsProps {
  metadata: unknown;
}

const getStatusIcon = (status?: string) => {
  const s = status?.toUpperCase();
  if (s === 'URL_RETRIEVAL_STATUS_SUCCESS' || s === 'SUCCESS')
    return <CheckCircle size={12} className="text-green-500" />;
  if (s === 'URL_RETRIEVAL_STATUS_UNSAFE' || s === 'UNSAFE')
    return <AlertTriangle size={12} className="text-red-500" />;
  if (s === 'URL_RETRIEVAL_STATUS_FAILED' || s === 'FAILED')
    return <AlertTriangle size={12} className="text-orange-500" />;
  return <Globe size={12} className="text-gray-400" />;
};

export const ContextUrls: React.FC<ContextUrlsProps> = ({ metadata }) => {
  const { t } = useI18n();
  const items = useMemo<UrlContextItem[]>(() => {
    if (!metadata) return [];
    const resolvedMetadata = metadata as { urlMetadata?: UrlContextItem[]; url_metadata?: UrlContextItem[] };
    // Handle both snake_case and camelCase
    return resolvedMetadata.urlMetadata || resolvedMetadata.url_metadata || [];
  }, [metadata]);

  if (items.length === 0) return null;

  return (
    <div className="mt-3 pt-2 border-t border-[var(--theme-border-secondary)]/30 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-2 mb-2">
        <LinkIcon size={11} className="text-[var(--theme-text-tertiary)]" strokeWidth={2} />
        <h4 className="text-[10px] font-bold uppercase text-[var(--theme-text-tertiary)] tracking-widest">
          {t('context_urls_title')}
        </h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => {
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
              title={t('context_urls_status').replace('{status}', status || t('unknown'))}
            >
              <div className="flex-shrink-0 pt-0.5">{getStatusIcon(status)}</div>
              <span className="text-xs font-mono text-[var(--theme-text-secondary)] truncate group-hover:text-[var(--theme-text-primary)]">
                {getDomain(url)}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};
