import { jsPDF } from 'jspdf';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

interface MarkdownPdfOptions {
  filename: string;
  themeId: string;
}

type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  ordered?: boolean;
  lang?: string;
  children?: MarkdownNode[];
};

type PdfDocument = InstanceType<typeof jsPDF>;

const PAGE = {
  marginX: 18,
  marginTop: 18,
  marginBottom: 18,
};

const TEXT = {
  body: 11,
  code: 9,
  small: 9,
  h1: 22,
  h2: 18,
  h3: 15,
};

const LINE_HEIGHT = 5.8;
const CODE_LINE_HEIGHT = 5;
const TEXT_STROKE_WIDTH = 0.06;
const CJK_FONT_NAME = 'NotoSansCJKsc';
const CJK_FONT_FILE = 'NotoSansCJKsc-VF.ttf';
const CJK_FONT_URL = `/fonts/${CJK_FONT_FILE}`;
const CJK_TEXT_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/;

let cjkFontBase64Promise: Promise<string | null> | null = null;

const getTextColor = (themeId: string) => (themeId === 'onyx' ? [255, 255, 255] : [0, 0, 0]);
const getMutedTextColor = (themeId: string) => (themeId === 'onyx' ? [161, 161, 170] : [82, 82, 91]);
const getRuleColor = (themeId: string) => (themeId === 'onyx' ? [63, 63, 70] : [212, 212, 216]);
const getCodeFillColor = (themeId: string) => (themeId === 'onyx' ? [39, 39, 42] : [244, 244, 245]);

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Image could not be converted for PDF export.'));
      }
    };
    reader.onerror = () => reject(new Error('Image could not be read for PDF export.'));
    reader.readAsDataURL(blob);
  });

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const loadCjkFontBase64 = async (): Promise<string | null> => {
  if (!cjkFontBase64Promise) {
    cjkFontBase64Promise = fetch(CJK_FONT_URL)
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return arrayBufferToBase64(await response.arrayBuffer());
      })
      .catch(() => null);
  }

  const fontBase64 = await cjkFontBase64Promise;
  if (!fontBase64) {
    cjkFontBase64Promise = null;
  }

  return fontBase64;
};

const fetchImageAsDataUrl = async (src: string): Promise<string | null> => {
  if (src.startsWith('data:image/')) {
    return src;
  }

  const sources = /^https?:\/\//i.test(src) ? [`/api/image-proxy?url=${encodeURIComponent(src)}`, src] : [src];

  for (const source of sources) {
    const dataUrl = await fetchImageSourceAsDataUrl(source);
    if (dataUrl) {
      return dataUrl;
    }
  }

  return null;
};

const fetchImageSourceAsDataUrl = async (src: string): Promise<string | null> => {
  try {
    const response = await fetch(src);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      return null;
    }

    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
};

const getImageSize = (src: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve({ width: 1200, height: 675 }), 3000);

    image.onload = () => {
      window.clearTimeout(timeout);
      resolve({
        width: image.naturalWidth || image.width || 1200,
        height: image.naturalHeight || image.height || 675,
      });
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve({ width: 1200, height: 675 });
    };
    image.src = src;
  });

const getImageFormat = (dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' => {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
};

const collectInlineText = (node: MarkdownNode): string => {
  if (node.type === 'text' || node.type === 'inlineCode') {
    return node.value ?? '';
  }

  if (node.type === 'break') {
    return '\n';
  }

  if (node.type === 'image') {
    const label = node.alt || 'image';
    return node.url ? `Image: ${label} (${node.url})` : `Image: ${label}`;
  }

  if (node.type === 'link') {
    const label = normalizeWhitespace((node.children ?? []).map(collectInlineText).join('')) || node.url || '';
    return node.url && label !== node.url ? `${label} (${node.url})` : label;
  }

  return (node.children ?? []).map(collectInlineText).join('');
};

class MarkdownPdfRenderer {
  private readonly doc: PdfDocument;
  private readonly pageWidth: number;
  private readonly pageHeight: number;
  private readonly contentWidth: number;
  private bodyFontFamily = 'helvetica';
  private cursorY = PAGE.marginTop;

  constructor(
    private readonly themeId: string,
    private readonly filename: string,
    private readonly shouldUseCjkFont: boolean,
  ) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - PAGE.marginX * 2;
  }

  async render(root: MarkdownNode): Promise<Blob> {
    await this.configureFonts();
    this.applyBodyStyle();
    await this.renderBlocks(root.children ?? []);
    this.renderFooter();
    return this.doc.output('blob') as Blob;
  }

  private async configureFonts() {
    if (!this.shouldUseCjkFont) {
      return;
    }

    const fontBase64 = await loadCjkFontBase64();
    if (!fontBase64) {
      return;
    }

    this.doc.addFileToVFS(CJK_FONT_FILE, fontBase64);
    this.doc.addFont(CJK_FONT_FILE, CJK_FONT_NAME, 'normal', 'Identity-H');
    this.bodyFontFamily = CJK_FONT_NAME;
  }

  private applyBodyStyle() {
    const [r, g, b] = getTextColor(this.themeId);
    this.doc.setFont(this.bodyFontFamily, 'normal');
    this.doc.setFontSize(TEXT.body);
    this.doc.setTextColor(r, g, b);
  }

  private setTextColor(color: number[]) {
    this.doc.setTextColor(color[0], color[1], color[2]);
  }

  private ensureSpace(height: number) {
    if (this.cursorY + height <= this.pageHeight - PAGE.marginBottom) {
      return;
    }

    this.doc.addPage();
    this.cursorY = PAGE.marginTop;
    this.applyBodyStyle();
  }

  private writeLines(lines: string[], options: { fontSize?: number; color?: number[]; indent?: number } = {}) {
    const fontSize = options.fontSize ?? TEXT.body;
    const color = options.color ?? getTextColor(this.themeId);
    const indent = options.indent ?? 0;
    const lineHeight = fontSize <= TEXT.code ? CODE_LINE_HEIGHT : LINE_HEIGHT;

    this.doc.setFontSize(fontSize);
    this.setTextColor(color);
    this.doc.setDrawColor(color[0], color[1], color[2]);
    this.doc.setLineWidth(TEXT_STROKE_WIDTH);

    lines.forEach((line) => {
      this.ensureSpace(lineHeight);
      this.doc.text(line, PAGE.marginX + indent, this.cursorY, { renderingMode: 'fillThenStroke' });
      this.cursorY += lineHeight;
    });
  }

  private splitText(text: string, width = this.contentWidth): string[] {
    const result = this.doc.splitTextToSize(text, width);
    return Array.isArray(result) ? result : [result];
  }

  private async renderBlocks(nodes: MarkdownNode[], options: { indent?: number } = {}) {
    for (const node of nodes) {
      await this.renderBlock(node, options);
    }
  }

  private async renderBlock(node: MarkdownNode, options: { indent?: number } = {}) {
    switch (node.type) {
      case 'heading':
        this.renderHeading(node);
        break;
      case 'paragraph':
        await this.renderParagraph(node, options);
        break;
      case 'list':
        await this.renderList(node, options);
        break;
      case 'code':
        this.renderCode(node, options);
        break;
      case 'blockquote':
        await this.renderBlockquote(node, options);
        break;
      case 'thematicBreak':
        this.renderRule();
        break;
      case 'table':
        this.renderTable(node, options);
        break;
      case 'html':
        this.renderPlainText(node.value ?? '', options);
        break;
      default:
        if (node.children?.length) {
          await this.renderBlocks(node.children, options);
        } else if (node.value) {
          this.renderPlainText(node.value, options);
        }
        break;
    }
  }

  private renderHeading(node: MarkdownNode) {
    const depth = Number((node as MarkdownNode & { depth?: number }).depth ?? 1);
    const fontSize = depth === 1 ? TEXT.h1 : depth === 2 ? TEXT.h2 : TEXT.h3;
    const text = normalizeWhitespace((node.children ?? []).map(collectInlineText).join(''));
    if (!text) return;

    this.cursorY += this.cursorY === PAGE.marginTop ? 0 : 3;
    this.doc.setFont(this.bodyFontFamily, this.bodyFontFamily === CJK_FONT_NAME ? 'normal' : 'bold');
    this.writeLines(this.splitText(text), { fontSize });
    this.doc.setFont(this.bodyFontFamily, 'normal');
    this.cursorY += 2;
  }

  private async renderParagraph(node: MarkdownNode, options: { indent?: number }) {
    const children = node.children ?? [];
    const hasImage = children.some((child) => child.type === 'image');
    if (hasImage) {
      await this.renderParagraphWithImages(children, options);
      return;
    }

    const text = normalizeWhitespace(children.map(collectInlineText).join(''));
    if (!text) return;

    const indent = options.indent ?? 0;
    this.applyBodyStyle();
    this.writeLines(this.splitText(text, this.contentWidth - indent), { indent });
    this.cursorY += 3;
  }

  private async renderParagraphWithImages(children: MarkdownNode[], options: { indent?: number }) {
    const flushText = (parts: string[]) => {
      const text = normalizeWhitespace(parts.join(''));
      if (!text) return;

      const indent = options.indent ?? 0;
      this.applyBodyStyle();
      this.writeLines(this.splitText(text, this.contentWidth - indent), { indent });
      this.cursorY += 3;
    };

    const textParts: string[] = [];
    for (const child of children) {
      if (child.type === 'image') {
        flushText(textParts);
        textParts.length = 0;
        await this.renderImage(child, options);
        continue;
      }

      textParts.push(collectInlineText(child));
    }

    flushText(textParts);
  }

  private renderPlainText(text: string, options: { indent?: number }) {
    const normalizedText = normalizeWhitespace(text);
    if (!normalizedText) return;

    const indent = options.indent ?? 0;
    this.writeLines(this.splitText(normalizedText, this.contentWidth - indent), { indent });
    this.cursorY += 3;
  }

  private async renderImage(node: MarkdownNode, options: { indent?: number }) {
    const src = node.url;
    const label = node.alt || 'image';
    const indent = options.indent ?? 0;
    if (!src) {
      this.renderPlainText(`Image: ${label}`, options);
      return;
    }

    const dataUrl = await fetchImageAsDataUrl(src);
    if (!dataUrl) {
      this.renderPlainText(`Image: ${label} (${src})`, options);
      return;
    }

    try {
      const size = await getImageSize(dataUrl);
      const maxWidth = this.contentWidth - indent;
      const naturalWidth = Math.max(1, size.width);
      const naturalHeight = Math.max(1, size.height);
      const width = maxWidth;
      const height = width * (naturalHeight / naturalWidth);
      this.ensureSpace(height + 6);
      this.doc.addImage(dataUrl, getImageFormat(dataUrl), PAGE.marginX + indent, this.cursorY, width, height);
      this.cursorY += height + 5;
    } catch {
      this.renderPlainText(`Image: ${label} (${src})`, options);
    }
  }

  private async renderList(node: MarkdownNode, options: { indent?: number }) {
    const baseIndent = options.indent ?? 0;
    const items = node.children ?? [];

    for (let index = 0; index < items.length; index += 1) {
      const itemText = normalizeWhitespace((items[index].children ?? []).map(collectInlineText).join(''));
      const marker = node.ordered ? `${index + 1}. ` : '- ';
      if (itemText) {
        this.writeLines(this.splitText(`${marker}${itemText}`, this.contentWidth - baseIndent), { indent: baseIndent });
      }

      const nestedBlocks = (items[index].children ?? []).filter((child) => child.type === 'list' || child.type === 'code');
      await this.renderBlocks(nestedBlocks, { indent: baseIndent + 6 });
      this.cursorY += 1.5;
    }

    this.cursorY += 2;
  }

  private renderCode(node: MarkdownNode, options: { indent?: number }) {
    const indent = options.indent ?? 0;
    const lines = (node.value ?? '').split('\n');
    const wrappedLines = lines.flatMap((line) => this.splitText(line || ' ', this.contentWidth - indent - 6));
    const blockHeight = wrappedLines.length * CODE_LINE_HEIGHT + 6;

    this.ensureSpace(blockHeight);
    const [fillR, fillG, fillB] = getCodeFillColor(this.themeId);
    this.doc.setFillColor(fillR, fillG, fillB);
    this.doc.rect(PAGE.marginX + indent, this.cursorY - 3, this.contentWidth - indent, blockHeight, 'F');
    this.doc.setFont(this.bodyFontFamily === CJK_FONT_NAME ? CJK_FONT_NAME : 'courier', 'normal');
    this.writeLines(wrappedLines, {
      fontSize: TEXT.code,
      color: getTextColor(this.themeId),
      indent: indent + 3,
    });
    this.doc.setFont(this.bodyFontFamily, 'normal');
    this.cursorY += 5;
  }

  private async renderBlockquote(node: MarkdownNode, options: { indent?: number }) {
    const indent = (options.indent ?? 0) + 5;
    const [r, g, b] = getRuleColor(this.themeId);
    this.ensureSpace(8);
    this.doc.setDrawColor(r, g, b);
    this.doc.setLineWidth(0.4);
    this.doc.line(PAGE.marginX + indent - 3, this.cursorY - 2, PAGE.marginX + indent - 3, this.cursorY + 8);
    await this.renderBlocks(node.children ?? [], { indent });
    this.cursorY += 2;
  }

  private renderRule() {
    this.ensureSpace(8);
    const [r, g, b] = getRuleColor(this.themeId);
    this.doc.setDrawColor(r, g, b);
    this.doc.line(PAGE.marginX, this.cursorY, this.pageWidth - PAGE.marginX, this.cursorY);
    this.cursorY += 8;
  }

  private renderTable(node: MarkdownNode, options: { indent?: number }) {
    const rows = node.children ?? [];
    rows.forEach((row) => {
      const rowText = (row.children ?? [])
        .map((cell) => normalizeWhitespace((cell.children ?? []).map(collectInlineText).join('')))
        .join(' | ');
      this.renderPlainText(rowText, options);
    });
  }

  private renderFooter() {
    const [r, g, b] = getMutedTextColor(this.themeId);
    const footer = `Generated with AMC WebUI - ${this.filename}`;
    this.doc.setFont(this.bodyFontFamily, 'normal');
    this.doc.setFontSize(TEXT.small);
    this.doc.setTextColor(r, g, b);
    this.doc.text(footer, PAGE.marginX, this.pageHeight - 8);
  }
}

export const createMarkdownPdfBlob = async (markdown: string, options: MarkdownPdfOptions): Promise<Blob> => {
  const processor = unified().use(remarkParse).use(remarkGfm);
  const tree = processor.parse(markdown || '') as MarkdownNode;
  const renderer = new MarkdownPdfRenderer(options.themeId, options.filename, CJK_TEXT_PATTERN.test(markdown));

  return renderer.render(tree);
};
