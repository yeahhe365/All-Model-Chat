import { logService } from '@/services/logService';
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Download, FileSpreadsheet, FileText, Copy, Check } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useWindowContext } from '@/contexts/WindowContext';
import { createManagedObjectUrl } from '@/services/objectUrlManager';
import { triggerDownload } from '@/utils/export/core';
import { useClickOutside } from '@/hooks/useClickOutside';
import {
  FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS,
  MENU_ITEM_BUTTON_CLASS,
  MENU_ITEM_COMPACT_BUTTON_CLASS,
  MENU_ITEM_DEFAULT_STATE_CLASS,
} from '@/constants/appConstants';

type HastElementLike = {
  properties?: Record<string, unknown>;
};

type TableBlockProps = React.TableHTMLAttributes<HTMLTableElement> & {
  node?: HastElementLike;
};

type TableChildProps = {
  children?: React.ReactNode;
  node?: HastElementLike;
};

const hasRawHtmlInlineStyle = (node?: HastElementLike): boolean => {
  return typeof node?.properties?.style === 'string' && node.properties.style.trim().length > 0;
};

const hasInlineStyle = (node: React.ReactNode): boolean => {
  return React.Children.toArray(node).some((child) => {
    if (!React.isValidElement<TableChildProps>(child)) {
      return false;
    }

    return hasRawHtmlInlineStyle(child.props.node) || hasInlineStyle(child.props.children);
  });
};

export const TableBlock: React.FC<TableBlockProps> = ({ children, className, node, ...props }) => {
  const { t } = useI18n();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { document: targetDocument } = useWindowContext();
  const tableRef = useRef<HTMLTableElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setShowDownloadMenu(false));

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    targetDocument.addEventListener('keydown', handleKeyDown);
    return () => targetDocument.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, targetDocument]);

  const handleCopyMarkdown = async () => {
    if (!tableRef.current) return;
    try {
      const { convertHtmlToMarkdown } = await import('@/utils/htmlToMarkdown');
      const markdown = convertHtmlToMarkdown(tableRef.current.outerHTML);
      await navigator.clipboard.writeText(markdown);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      logService.error('Failed to copy markdown table', e);
    }
  };

  const handleDownloadCSV = () => {
    if (!tableRef.current) return;
    const rows = Array.from(tableRef.current.querySelectorAll('tr'));
    const csvContent = rows
      .map((row) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells
          .map((cell) => {
            const text = (cell as HTMLElement).innerText || '';
            // Escape double quotes by doubling them
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(',');
      })
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = createManagedObjectUrl(blob);
    triggerDownload(url, `table-export-${Date.now()}.csv`);
    setShowDownloadMenu(false);
  };

  const handleDownloadExcel = async () => {
    if (!tableRef.current) return;

    const tableHtml = tableRef.current.outerHTML;
    const template = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta charset="utf-8"></head>
            <body>${tableHtml}</body></html>`;
    const blob = new Blob([template], { type: 'application/vnd.ms-excel' });
    const url = createManagedObjectUrl(blob);
    triggerDownload(url, `table-export-${Date.now()}.xls`);
    setShowDownloadMenu(false);
  };

  const isRichHtmlTable = hasRawHtmlInlineStyle(node) || hasInlineStyle(children);
  const tableClassName = [className, isRichHtmlTable ? 'rich-html-table' : 'min-w-full w-max text-left']
    .filter(Boolean)
    .join(' ');
  const inlineContainerClassName = isRichHtmlTable
    ? 'relative group/table my-4 w-full max-w-full overflow-visible'
    : 'relative group/table my-4 w-full max-w-full rounded-xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-primary)]/40 overflow-visible';
  const fullscreenContainerClassName = isRichHtmlTable
    ? 'w-full max-w-6xl mx-auto markdown-body p-0 my-0'
    : 'w-full max-w-6xl mx-auto bg-[var(--theme-bg-primary)] rounded-lg shadow-xl overflow-hidden border border-[var(--theme-border-secondary)] markdown-body p-0 my-0';

  // When fullscreen, we use a portal and a specific layout.
  if (isFullscreen) {
    return createPortal(
      <div
        data-table-fullscreen-overlay="true"
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[2200] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] p-4 sm:p-10 overflow-auto overscroll-contain flex flex-col items-center animate-in fade-in duration-200"
      >
        <div className="fixed top-4 right-4 flex gap-2 z-50">
          <button
            onClick={handleCopyMarkdown}
            className={`p-1.5 rounded-lg bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)] transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
            title={isCopied ? t('copied') : t('table_copy_markdown')}
          >
            {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className={`p-1.5 rounded-lg bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)] transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
              title={t('download')}
            >
              <Download size={16} />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-xl overflow-hidden z-50">
                <button
                  onClick={handleDownloadCSV}
                  className={`${MENU_ITEM_BUTTON_CLASS} ${MENU_ITEM_DEFAULT_STATE_CLASS} px-4 py-3 gap-3`}
                >
                  <FileText size={16} className="text-blue-500" />
                  <span>{t('exportToCSV')}</span>
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className={`${MENU_ITEM_BUTTON_CLASS} ${MENU_ITEM_DEFAULT_STATE_CLASS} px-4 py-3 gap-3`}
                >
                  <FileSpreadsheet size={16} className="text-green-500" />
                  <span>{t('exportToExcel')}</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-sm border border-[var(--theme-border-secondary)] transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
            title={t('table_exit_fullscreen')}
          >
            <Minimize2 size={16} />
          </button>
        </div>

        <div className={fullscreenContainerClassName} data-rich-html-table-container={isRichHtmlTable || undefined}>
          <div className="overflow-x-auto">
            <table ref={tableRef} className={tableClassName} {...props}>
              {children}
            </table>
          </div>
        </div>
      </div>,
      targetDocument.body,
    );
  }

  // Default inline view - Enclosed container with floating top-right actions
  return (
    <div
      className={inlineContainerClassName}
      data-rich-html-table-container={isRichHtmlTable || undefined}
      data-table-actions-scope="true"
    >
      {/* Scrollable Table Container */}
      <div className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-[var(--theme-scrollbar-thumb)] scrollbar-track-transparent w-full">
        <table ref={tableRef} className={tableClassName} {...props}>
          {children}
        </table>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 pointer-events-none transition-opacity duration-200 group-hover/table:opacity-100 group-hover/table:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto">
        <button
          onClick={handleCopyMarkdown}
          aria-label={t('table_copy_markdown_aria')}
          className={`p-1.5 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
          title={isCopied ? t('copied') : t('table_copy_markdown')}
        >
          {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            aria-label={t('table_download_aria')}
            className={`p-1.5 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
            title={t('download')}
          >
            <Download size={14} />
          </button>
          {showDownloadMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-lg shadow-lg overflow-hidden z-50">
              <button
                onClick={handleDownloadCSV}
                className={`${MENU_ITEM_COMPACT_BUTTON_CLASS} ${MENU_ITEM_DEFAULT_STATE_CLASS}`}
              >
                <FileText size={14} className="text-blue-500" />
                <span>{t('exportToCSV')}</span>
              </button>
              <button
                onClick={handleDownloadExcel}
                className={`${MENU_ITEM_COMPACT_BUTTON_CLASS} ${MENU_ITEM_DEFAULT_STATE_CLASS}`}
              >
                <FileSpreadsheet size={14} className="text-green-500" />
                <span>{t('exportToExcel')}</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={toggleFullscreen}
          aria-label={t('table_fullscreen_aria')}
          className={`p-1.5 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
          title={t('htmlPreview_fullscreen')}
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
};
