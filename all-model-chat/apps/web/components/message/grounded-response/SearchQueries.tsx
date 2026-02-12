
import React from 'react';
import { IconGoogle } from '../../icons/CustomIcons';

interface SearchQueriesProps {
    queries: string[];
}

export const SearchQueries: React.FC<SearchQueriesProps> = ({ queries }) => {
    if (!queries || queries.length === 0) return null;

    return (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar select-none">
            <div className="flex-shrink-0 pt-0.5">
                <IconGoogle size={18} />
            </div>
            <div className="flex items-center gap-2">
                {queries.map((q, i) => (
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
    );
};
