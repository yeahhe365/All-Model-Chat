
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Download, FileSpreadsheet, FileText, Copy, Check } from 'lucide-react';
import { useWindowContext } from '../../../contexts/WindowContext';
import { triggerDownload } from '../../../utils/exportUtils';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { translations } from '../../../utils/appUtils';
import { convertHtmlToMarkdown } from '../../../utils/htmlToMarkdown';

interface TableBlockProps extends React.TableHTMLAttributes<HTMLTableElement> {
    t?: (key: keyof typeof translations) => string;
}

export const TableBlock: React.FC<TableBlockProps> = ({ children, className, t, ...props }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const { document: targetDocument } = useWindowContext();
    const tableRef = useRef<HTMLTableElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    useClickOutside(menuRef, () => setShowDownloadMenu(false));

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    const handleCopyMarkdown = async () => {
        if (!tableRef.current) return;
        try {
            const markdown = convertHtmlToMarkdown(tableRef.current.outerHTML);
            await navigator.clipboard.writeText(markdown);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (e) {
            console.error("Failed to copy markdown table", e);
        }
    };

    const handleDownloadCSV = () => {
        if (!tableRef.current) return;
        const rows = Array.from(tableRef.current.querySelectorAll('tr'));
        const csvContent = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('th, td'));
            return cells.map(cell => {
                const text = (cell as HTMLElement).innerText || '';
                // Escape double quotes by doubling them
                return `"${text.replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `table-export-${Date.now()}.csv`);
        setShowDownloadMenu(false);
    };

    const handleDownloadExcel = async () => {
        if (!tableRef.current) return;
        
        try {
            // Dynamically import xlsx to avoid heavy bundle size if not used
            // @ts-ignore - xlsx is provided via importmap
            const XLSX = await import('xlsx');
            
            if (XLSX && XLSX.utils && XLSX.writeFile) {
                const wb = XLSX.utils.table_to_book(tableRef.current);
                XLSX.writeFile(wb, `table-export-${Date.now()}.xlsx`);
            } else {
                console.error("XLSX library not loaded correctly.");
                // Fallback to simple HTML table as XLS (XML compatible)
                const tableHtml = tableRef.current.outerHTML;
                const template = `
                    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                    <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta charset="utf-8"></head>
                    <body>${tableHtml}</body></html>`;
                const blob = new Blob([template], { type: 'application/vnd.ms-excel' });
                const url = URL.createObjectURL(blob);
                triggerDownload(url, `table-export-${Date.now()}.xls`);
            }
        } catch (e) {
            console.error("Failed to export Excel", e);
        }
        setShowDownloadMenu(false);
    };

    const tFunc = t || ((key: string) => key === 'exportToCSV' ? 'Export to CSV' : 'Export to Excel');

    // When fullscreen, we use a portal and a specific layout.
    if (isFullscreen) {
        return createPortal(
            <div className="fixed inset-0 z-[2000] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] p-4 sm:p-10 overflow-auto flex flex-col items-center animate-in fade-in duration-200 backdrop-blur-sm">
                <div className="fixed top-4 right-4 flex gap-2 z-50">
                    <button
                        onClick={handleCopyMarkdown}
                        className="p-1.5 rounded-lg bg-[var(--theme-bg-primary)]/90 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)] transition-all hover:scale-105 backdrop-blur-sm"
                        title={isCopied ? "Copied!" : "Copy Markdown"}
                    >
                        {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>

                    <div className="relative" ref={menuRef}>
                         <button
                            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                            className="p-1.5 rounded-lg bg-[var(--theme-bg-primary)]/90 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)] transition-all hover:scale-105 backdrop-blur-sm"
                            title="Download"
                        >
                            <Download size={16} />
                        </button>
                        
                        {showDownloadMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                                <button 
                                    onClick={handleDownloadCSV}
                                    className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-3 transition-colors text-[var(--theme-text-primary)]"
                                >
                                    <FileText size={16} className="text-blue-500" />
                                    <span>{tFunc('exportToCSV')}</span>
                                </button>
                                <button 
                                    onClick={handleDownloadExcel}
                                    className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-3 transition-colors text-[var(--theme-text-primary)]"
                                >
                                    <FileSpreadsheet size={16} className="text-green-500" />
                                    <span>{tFunc('exportToExcel')}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={toggleFullscreen}
                        className="p-1.5 rounded-lg bg-[var(--theme-bg-primary)]/90 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)] transition-all hover:scale-105 backdrop-blur-sm"
                        title="Exit Fullscreen"
                    >
                        <Minimize2 size={16} />
                    </button>
                </div>

                <div className="w-full max-w-6xl mx-auto bg-[var(--theme-bg-primary)] rounded-lg shadow-xl overflow-hidden border border-[var(--theme-border-secondary)] markdown-body p-0 my-0">
                    <div className="overflow-x-auto">
                        <table ref={tableRef} className={`${className || ''}`} {...props}>
                            {children}
                        </table>
                    </div>
                </div>
            </div>,
            targetDocument.body
        );
    }

    // Default inline view - Enclosed container with floating top-right actions
    return (
        <div className="relative group my-4 w-full rounded-lg bg-[var(--theme-bg-primary)] overflow-hidden">
            {/* Scrollable Table Container */}
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--theme-scrollbar-thumb)] scrollbar-track-transparent w-full">
                <table ref={tableRef} className={`${className || ''} w-full text-left`} {...props}>
                    {children}
                </table>
            </div>

            {/* Floating Action Buttons */}
            <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onClick={handleCopyMarkdown}
                    className="p-1.5 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                    title={isCopied ? "Copied!" : "Copy Markdown"}
                >
                    {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>

                 <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                        className="p-1.5 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                        title="Download"
                    >
                        <Download size={14} />
                    </button>
                    {showDownloadMenu && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                            <button 
                                onClick={handleDownloadCSV}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2 transition-colors text-[var(--theme-text-primary)]"
                            >
                                <FileText size={14} className="text-blue-500" />
                                <span>{tFunc('exportToCSV')}</span>
                            </button>
                            <button 
                                onClick={handleDownloadExcel}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2 transition-colors text-[var(--theme-text-primary)]"
                            >
                                <FileSpreadsheet size={14} className="text-green-500" />
                                <span>{tFunc('exportToExcel')}</span>
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                    title="Fullscreen"
                >
                    <Maximize2 size={14} />
                </button>
            </div>
        </div>
    );
};
