import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMarkdownPdfBlob } from './markdownPdf';

const outputMock = vi.fn(() => new Blob(['pdf'], { type: 'application/pdf' }));
const textMock = vi.fn();
const addImageMock = vi.fn();
const setFontMock = vi.fn();
const setTextColorMock = vi.fn();
const setDrawColorMock = vi.fn();
const setLineWidthMock = vi.fn();
const addFileToVFSMock = vi.fn();
const addFontMock = vi.fn();
const splitTextToSizeMock = vi.fn((text: string) => [text]);
const expectPdfBodyText = (text: string) => {
  expect(textMock).toHaveBeenCalledWith(
    text,
    expect.any(Number),
    expect.any(Number),
    expect.objectContaining({ renderingMode: 'fillThenStroke' }),
  );
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(function MockJsPdf() {
    return {
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      addPage: vi.fn(),
      addImage: addImageMock,
      addFileToVFS: addFileToVFSMock,
      addFont: addFontMock,
      setFont: setFontMock,
      setFontSize: vi.fn(),
      setTextColor: setTextColorMock,
      setDrawColor: setDrawColorMock,
      setFillColor: vi.fn(),
      setLineWidth: setLineWidthMock,
      line: vi.fn(),
      rect: vi.fn(),
      text: textMock,
      splitTextToSize: splitTextToSizeMock,
      output: outputMock,
    };
  }),
}));

describe('createMarkdownPdfBlob', () => {
  beforeEach(() => {
    outputMock.mockClear();
    textMock.mockClear();
    addImageMock.mockClear();
    setFontMock.mockClear();
    setTextColorMock.mockClear();
    setDrawColorMock.mockClear();
    setLineWidthMock.mockClear();
    addFileToVFSMock.mockClear();
    addFontMock.mockClear();
    splitTextToSizeMock.mockClear();
  });

  it('renders Markdown text into a PDF blob without html2canvas/html2pdf', async () => {
    const blob = await createMarkdownPdfBlob('# Title\n\nHello **world**.', {
      filename: 'article.pdf',
      themeId: 'pearl',
    });

    expect(blob.type).toBe('application/pdf');
    expect(outputMock).toHaveBeenCalledWith('blob');
    expectPdfBodyText('Title');
    expectPdfBodyText('Hello world.');
  });

  it('uses pure black body text in light PDF exports', async () => {
    await createMarkdownPdfBlob('Readable text', {
      filename: 'article.pdf',
      themeId: 'pearl',
    });

    expect(setTextColorMock).toHaveBeenCalledWith(0, 0, 0);
  });

  it('adds a light text stroke so PDF body text reads darker', async () => {
    await createMarkdownPdfBlob('Readable text', {
      filename: 'article.pdf',
      themeId: 'pearl',
    });

    const bodyTextCall = textMock.mock.calls.find(([text]) => text === 'Readable text');
    expect(bodyTextCall).toBeDefined();
    expect(bodyTextCall?.[3]).toMatchObject({ renderingMode: 'fillThenStroke' });
    expect(setDrawColorMock).toHaveBeenCalledWith(0, 0, 0);
    expect(setLineWidthMock).toHaveBeenCalledWith(0.06);
  });

  it('loads the CJK font before writing Chinese text', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    globalThis.fetch = fetchMock;

    try {
      await createMarkdownPdfBlob('# 中文标题\n\n你好，世界。', {
        filename: 'article.pdf',
        themeId: 'pearl',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(fetchMock).toHaveBeenCalledWith('/fonts/NotoSansCJKsc-VF.ttf');
    expect(addFileToVFSMock).toHaveBeenCalledWith('NotoSansCJKsc-VF.ttf', expect.any(String));
    expect(addFontMock).toHaveBeenCalledWith('NotoSansCJKsc-VF.ttf', 'NotoSansCJKsc', 'normal', 'Identity-H');
    expect(setFontMock).toHaveBeenCalledWith('NotoSansCJKsc', 'normal');
    expectPdfBodyText('中文标题');
    expectPdfBodyText('你好，世界。');
  });

  it('keeps an unreachable external image as link text instead of drawing an empty block', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('blocked by CORS'));

    try {
      await createMarkdownPdfBlob('![diagram](https://example.invalid/diagram.png)', {
        filename: 'article.pdf',
        themeId: 'pearl',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expectPdfBodyText('Image: diagram (https://example.invalid/diagram.png)');
  });

  it('uses the same-origin image proxy for external images', async () => {
    const originalFetch = globalThis.fetch;
    const imageBlob = new Blob(['png'], { type: 'image/png' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => imageBlob,
    });
    globalThis.fetch = fetchMock;

    try {
      await createMarkdownPdfBlob('![diagram](https://cdn.example.com/diagram.png)', {
        filename: 'article.pdf',
        themeId: 'pearl',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(fetchMock).toHaveBeenCalledWith('/api/image-proxy?url=https%3A%2F%2Fcdn.example.com%2Fdiagram.png');
    expect(fetchMock).not.toHaveBeenCalledWith('https://cdn.example.com/diagram.png');
    expect(addImageMock).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/png;base64,/),
      'PNG',
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('renders images embedded inside a paragraph instead of flattening them to text', async () => {
    const originalFetch = globalThis.fetch;
    const imageBlob = new Blob(['png'], { type: 'image/png' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => imageBlob,
    });
    globalThis.fetch = fetchMock;

    try {
      await createMarkdownPdfBlob('Intro ![diagram](https://cdn.example.com/diagram.png) Outro', {
        filename: 'article.pdf',
        themeId: 'pearl',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expectPdfBodyText('Intro');
    expect(addImageMock).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/png;base64,/),
      'PNG',
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
    expectPdfBodyText('Outro');
    expect(textMock).not.toHaveBeenCalledWith(
      'Intro Image: diagram (https://cdn.example.com/diagram.png) Outro',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('expands images to the PDF content width while preserving aspect ratio', async () => {
    const originalFetch = globalThis.fetch;
    const originalImage = globalThis.Image;

    class MockImage {
      naturalWidth = 400;
      naturalHeight = 200;
      width = 400;
      height = 200;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    const imageBlob = new Blob(['png'], { type: 'image/png' });
    globalThis.Image = MockImage as unknown as typeof Image;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => imageBlob,
    });

    try {
      await createMarkdownPdfBlob('![tall](https://cdn.example.com/tall.png)', {
        filename: 'article.pdf',
        themeId: 'pearl',
      });
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.Image = originalImage;
    }

    const imageCall = addImageMock.mock.calls.at(-1);
    expect(imageCall).toBeDefined();
    if (!imageCall) {
      throw new Error('Expected PDF export to draw an image');
    }

    const width = imageCall[4] as number;
    const height = imageCall[5] as number;
    expect(width).toBeCloseTo(174, 2);
    expect(height).toBeCloseTo(87, 2);
  });
});
