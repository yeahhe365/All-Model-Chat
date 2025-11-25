
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Download } from 'lucide-react';
import { useWindowContext } from '../../contexts/WindowContext';
import { triggerDownload } from '../../utils/exportUtils';

export const TableBlock: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ children, className, ...props }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { document: targetDocument } = useWindowContext();
    const tableRef = useRef<HTMLTableElement>(null);

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    const handleDownloadCSV = () => {
        if (!tableRef.current) return;
        const rows = Array.from(tableRef.current.querySelectorAll('tr'));
        const csvContent = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('th, td'));
            return cells.map(cell => {
                const text = cell.innerText || '';
                // Escape double quotes by doubling them
                return `"${text.replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `table-export-${Date.now()}.csv`);
    };

    const Wrapper = isFullscreen ? 'div' : 'div';
    // Added text-[var(--theme-text-primary)] to wrapper to ensure text visibility in portal
    const wrapperClasses = isFullscreen 
        ? "fixed inset-0 z-[2000] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] p-4 sm:p-10 overflow-auto flex flex-col items-center animate-in fade-in duration-200 backdrop-blur-sm"
        : "relative group my-4 overflow-x-auto rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] shadow-sm scrollbar-thin scrollbar-thumb-[var(--theme-scrollbar-thumb)] scrollbar-track-transparent";

    // When fullscreen, we allow the table to be centered and larger.
    // Added 'markdown-body' to apply table specific styles (borders, stripes) defined in index.css.
    // Added !p-0 !m-0 !max-w-6xl to override default markdown-body layout styles.
    const tableContainerClasses = isFullscreen
        ? "w-full !max-w-6xl mx-auto bg-[var(--theme-bg-primary)] rounded-lg shadow-xl overflow-hidden border border-[var(--theme-border-secondary)] markdown-body !p-0 !my-0"
        : "w-full min-w-full";

    const content = (
        <Wrapper className={wrapperClasses}>
            {/* Floating Action Buttons */}
            <div className={`absolute top-2 right-2 flex gap-2 z-10 ${isFullscreen ? 'fixed' : 'opacity-0 group-hover:opacity-100 transition-opacity duration-200'}`}>
                 <button
                    onClick={handleDownloadCSV}
                    className="p-1.5 rounded-lg bg-[var(--theme-bg-primary)]/90 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)] transition-all hover:scale-105 backdrop-blur-sm"
                    title="Download CSV"
                >
                    <Download size={16} />
                </button>
                <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg bg-[var(--theme-bg-primary)]/90 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)] transition-all hover:scale-105 backdrop-blur-sm"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
            </div>

            <div className={tableContainerClasses}>
                <table ref={tableRef} className={`${className || ''}`} {...props}>
                    {children}
                </table>
            </div>
        </Wrapper>
    );

    if (isFullscreen) {
        return createPortal(content, targetDocument.body);
    }

    return content;
};
