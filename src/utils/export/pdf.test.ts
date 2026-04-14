import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadHtml2PdfFactory } from './pdf';

const mockedHtml2PdfFactory = vi.fn();

vi.mock('html2pdf.js', () => ({
  default: mockedHtml2PdfFactory,
}));

describe('loadHtml2PdfFactory', () => {
  afterEach(() => {
    delete (window as Window & { html2pdf?: unknown }).html2pdf;
    mockedHtml2PdfFactory.mockReset();
  });

  it('prefers an existing global factory when one is already loaded', async () => {
    const globalFactory = vi.fn();
    (window as Window & { html2pdf?: unknown }).html2pdf = globalFactory;

    const factory = await loadHtml2PdfFactory();

    expect(factory).toBe(globalFactory);
    expect(mockedHtml2PdfFactory).not.toHaveBeenCalled();
  });

  it('falls back to the module factory when the global is missing', async () => {
    const factory = await loadHtml2PdfFactory();

    expect(factory).toBe(mockedHtml2PdfFactory);
  });
});
