import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WindowProvider } from '../../../contexts/WindowContext';
import { TableBlock } from './TableBlock';

const triggerDownloadMock = vi.hoisted(() => vi.fn());

vi.mock('../../../utils/export/core', () => ({
  triggerDownload: triggerDownloadMock,
}));

describe('TableBlock', () => {
  const renderer = setupTestRenderer();

  afterEach(() => {
    triggerDownloadMock.mockReset();
  });

  it('renders tables with natural-width scrolling classes instead of forcing full-width compression', () => {
    act(() => {
      renderer.root.render(
        <WindowProvider window={window} document={document}>
          <TableBlock>
            <thead>
              <tr>
                <th>Name</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Alice</td>
                <td>Long notes that should not force the table into an artificially compressed width.</td>
              </tr>
            </tbody>
          </TableBlock>
        </WindowProvider>,
      );
    });

    const table = renderer.container.querySelector('table');
    const tableClasses = table?.className.split(/\s+/) ?? [];

    expect(tableClasses).toContain('w-max');
    expect(tableClasses).toContain('min-w-full');
    expect(tableClasses).not.toContain('w-full');
  });

  it('keeps inline action controls available without hover on compact viewports', () => {
    act(() => {
      renderer.root.render(
        <WindowProvider window={window} document={document}>
          <TableBlock>
            <tbody>
              <tr>
                <td>Name</td>
                <td>Alice</td>
              </tr>
            </tbody>
          </TableBlock>
        </WindowProvider>,
      );
    });

    const actionBar = renderer.container.querySelector('.absolute.top-2.right-2');

    expect(actionBar?.className).toContain('opacity-100');
    expect(actionBar?.className).toContain('pointer-events-auto');
    expect(actionBar?.className).toContain('sm:opacity-0');
    expect(actionBar?.className).toContain('sm:group-hover:opacity-100');
  });

  it('exports Excel using the safe HTML workbook fallback without loading xlsx', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:table-export');

    await act(async () => {
      renderer.root.render(
        <WindowProvider window={window} document={document}>
          <TableBlock>
            <tbody>
              <tr>
                <td>Name</td>
                <td>Alice</td>
              </tr>
            </tbody>
          </TableBlock>
        </WindowProvider>,
      );
    });

    const downloadButton = renderer.container.querySelector('button[title="Download"]');
    expect(downloadButton).not.toBeNull();

    await act(async () => {
      downloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const excelButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Export to Excel'),
    );
    expect(excelButton).not.toBeUndefined();

    await act(async () => {
      excelButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(createObjectUrl).toHaveBeenCalledWith(expect.objectContaining({ type: 'application/vnd.ms-excel' }));
    expect(triggerDownloadMock).toHaveBeenCalledWith(
      'blob:table-export',
      expect.stringMatching(/^table-export-\d+\.xls$/),
    );

    createObjectUrl.mockRestore();
  });
});
