import { logService } from '@/services/logService';
type ColorChannels = {
  r: number;
  g: number;
  b: number;
  a: number;
};

type ColorStop = {
  color: ColorChannels;
  percentage?: number;
};

type CssColorSanitizerOptions = {
  resolveCssVariable?: (name: string) => string;
};

const defaultResolveCssVariable = (name: string): string => {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const formatAlpha = (alpha: number): string => {
  const rounded = Math.round(clamp(alpha, 0, 1) * 1000) / 1000;
  return rounded.toString();
};

const formatRgba = ({ r, g, b, a }: ColorChannels): string => {
  return `rgba(${Math.round(clamp(r, 0, 255))}, ${Math.round(clamp(g, 0, 255))}, ${Math.round(clamp(b, 0, 255))}, ${formatAlpha(a)})`;
};

const parseCssNumber = (value: string): number => Number(value.trim());

const splitTopLevel = (value: string, separator: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of value) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);

    if (char === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
};

const findMatchingParenthesis = (value: string, openIndex: number): number => {
  let depth = 0;

  for (let index = openIndex; index < value.length; index += 1) {
    const char = value[index];
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
};

const parseHexColor = (value: string): ColorChannels | null => {
  const match = value.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!match) return null;

  let hex = match[1];
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
  }

  const hasAlpha = hex.length === 8;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hasAlpha ? parseInt(hex.slice(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
};

const parseRgbChannel = (value: string): number => {
  if (value.endsWith('%')) {
    return clamp((Number(value.slice(0, -1)) / 100) * 255, 0, 255);
  }
  return clamp(Number(value), 0, 255);
};

const parseAlphaChannel = (value: string | undefined): number => {
  if (!value) return 1;
  if (value.endsWith('%')) {
    return clamp(Number(value.slice(0, -1)) / 100, 0, 1);
  }
  return clamp(Number(value), 0, 1);
};

const parseRgbColor = (value: string): ColorChannels | null => {
  const match = value.match(/^rgba?\((.*)\)$/i);
  if (!match) return null;

  const normalized = match[1].replace(/\s*\/\s*/, ' ');
  const channels = normalized.includes(',')
    ? normalized.split(',').map((part) => part.trim())
    : normalized.split(/\s+/).filter(Boolean);

  if (channels.length < 3) return null;

  return {
    r: parseRgbChannel(channels[0]),
    g: parseRgbChannel(channels[1]),
    b: parseRgbChannel(channels[2]),
    a: parseAlphaChannel(channels[3]),
  };
};

const parseHueDegrees = (value: string): number => {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.endsWith('turn')) return parseCssNumber(trimmed.slice(0, -4)) * 360;
  if (trimmed.endsWith('rad')) return parseCssNumber(trimmed.slice(0, -3)) * (180 / Math.PI);
  if (trimmed.endsWith('grad')) return parseCssNumber(trimmed.slice(0, -4)) * 0.9;
  if (trimmed.endsWith('deg')) return parseCssNumber(trimmed.slice(0, -3));
  return parseCssNumber(trimmed);
};

const parseOklchLightness = (value: string): number => {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) return clamp(parseCssNumber(trimmed.slice(0, -1)) / 100, 0, 1);
  return clamp(parseCssNumber(trimmed), 0, 1);
};

const linearSrgbToChannel = (value: number): number => {
  const clamped = clamp(value, 0, 1);
  const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;

  return encoded * 255;
};

const parseOklchColor = (value: string): ColorChannels | null => {
  const match = value.match(/^oklch\((.*)\)$/i);
  if (!match) return null;

  const parts = match[1]
    .replace(/\s*\/\s*/, ' / ')
    .split(/\s+/)
    .filter(Boolean);
  const slashIndex = parts.indexOf('/');
  const colorParts = slashIndex === -1 ? parts : parts.slice(0, slashIndex);
  const alphaPart = slashIndex === -1 ? undefined : parts[slashIndex + 1];

  if (colorParts.length < 3) return null;

  const lightness = parseOklchLightness(colorParts[0]);
  const chroma = parseCssNumber(colorParts[1]);
  const hueRadians = parseHueDegrees(colorParts[2]) * (Math.PI / 180);

  if (![lightness, chroma, hueRadians].every(Number.isFinite)) return null;

  const okA = chroma * Math.cos(hueRadians);
  const okB = chroma * Math.sin(hueRadians);

  const lPrime = lightness + 0.3963377774 * okA + 0.2158037573 * okB;
  const mPrime = lightness - 0.1055613458 * okA - 0.0638541728 * okB;
  const sPrime = lightness - 0.0894841775 * okA - 1.291485548 * okB;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  return {
    r: linearSrgbToChannel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearSrgbToChannel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearSrgbToChannel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    a: parseAlphaChannel(alphaPart),
  };
};

const parseCssColor = (
  value: string,
  resolveCssVariable: (name: string) => string,
  depth = 0,
): ColorChannels | null => {
  const trimmed = value.trim();
  if (!trimmed || depth > 5) return null;
  if (trimmed === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (trimmed === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  if (trimmed === 'white') return { r: 255, g: 255, b: 255, a: 1 };

  if (trimmed.startsWith('var(') && trimmed.endsWith(')')) {
    const variableParts = splitTopLevel(trimmed.slice(4, -1), ',');
    const variableName = variableParts[0]?.trim();
    const resolved = variableName ? resolveCssVariable(variableName) : '';
    const fallback = variableParts.slice(1).join(',').trim();

    if (resolved) {
      return parseCssColor(resolved, resolveCssVariable, depth + 1);
    }
    if (fallback) {
      return parseCssColor(fallback, resolveCssVariable, depth + 1);
    }
    return null;
  }

  return parseHexColor(trimmed) ?? parseRgbColor(trimmed) ?? parseOklchColor(trimmed);
};

const parseColorStop = (value: string, resolveCssVariable: (name: string) => string): ColorStop | null => {
  const match = value.trim().match(/^(.*?)(?:\s*([+-]?\d*\.?\d+)%)?$/);
  if (!match) return null;

  const color = parseCssColor(match[1].trim(), resolveCssVariable);
  if (!color) return null;

  return {
    color,
    percentage: match[2] === undefined ? undefined : clamp(Number(match[2]) / 100, 0, 1),
  };
};

const resolveColorMixWeights = (first?: number, second?: number): [number, number] => {
  if (first === undefined && second === undefined) return [0.5, 0.5];
  if (first !== undefined && second === undefined) return [first, 1 - first];
  if (first === undefined && second !== undefined) return [1 - second, second];

  const total = (first ?? 0) + (second ?? 0);
  if (total <= 0) return [0, 0];
  return [(first ?? 0) / total, (second ?? 0) / total];
};

const mixColors = (
  first: ColorChannels,
  firstWeight: number,
  second: ColorChannels,
  secondWeight: number,
): ColorChannels => {
  if (first.a > 0 && second.a === 0) {
    return { ...first, a: first.a * firstWeight };
  }

  if (first.a === 0 && second.a > 0) {
    return { ...second, a: second.a * secondWeight };
  }

  const alpha = first.a * firstWeight + second.a * secondWeight;
  if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 };

  return {
    r: (first.r * first.a * firstWeight + second.r * second.a * secondWeight) / alpha,
    g: (first.g * first.a * firstWeight + second.g * second.a * secondWeight) / alpha,
    b: (first.b * first.a * firstWeight + second.b * second.a * secondWeight) / alpha,
    a: alpha,
  };
};

const convertColorMixToRgba = (expression: string, resolveCssVariable: (name: string) => string): string => {
  const inner = expression.slice('color-mix('.length, -1);
  const parts = splitTopLevel(inner, ',');
  if (parts.length < 3 || !parts[0].trim().startsWith('in ')) {
    return 'rgba(0, 0, 0, 0)';
  }

  const firstStop = parseColorStop(parts[1], resolveCssVariable);
  const secondStop = parseColorStop(parts[2], resolveCssVariable);
  if (!firstStop || !secondStop) {
    return 'rgba(0, 0, 0, 0)';
  }

  const [firstWeight, secondWeight] = resolveColorMixWeights(firstStop.percentage, secondStop.percentage);
  return formatRgba(mixColors(firstStop.color, firstWeight, secondStop.color, secondWeight));
};

const convertOklchToRgba = (expression: string): string => {
  const color = parseOklchColor(expression);
  return color ? formatRgba(color) : 'rgba(0, 0, 0, 0)';
};

const replaceCssFunction = (css: string, functionName: string, replacement: (expression: string) => string): string => {
  const lowerCss = css.toLowerCase();
  const search = `${functionName.toLowerCase()}(`;
  let cursor = 0;
  let result = '';

  while (cursor < css.length) {
    const start = lowerCss.indexOf(search, cursor);
    if (start === -1) {
      result += css.slice(cursor);
      break;
    }

    const openIndex = start + functionName.length;
    const end = findMatchingParenthesis(css, openIndex);
    if (end === -1) {
      result += css.slice(cursor);
      break;
    }

    result += css.slice(cursor, start);
    result += replacement(css.slice(start, end + 1));
    cursor = end + 1;
  }

  return result;
};

/**
 * html2canvas 1.x cannot parse modern CSS color functions emitted by Tailwind v4,
 * especially oklch(...) and color-mix(in oklab, ...). Convert them in the PNG snapshot CSS only.
 */
export const sanitizeCssColorFunctionsForPngExport = (css: string, options: CssColorSanitizerOptions = {}): string => {
  const resolveCssVariable = options.resolveCssVariable ?? defaultResolveCssVariable;
  const cssWithoutColorMix = replaceCssFunction(css, 'color-mix', (expression) =>
    convertColorMixToRgba(expression, resolveCssVariable),
  );

  return replaceCssFunction(cssWithoutColorMix, 'oklch', convertOklchToRgba);
};

export const sanitizeDocumentStylesForPngExport = (doc: Document): void => {
  doc.querySelectorAll('style').forEach((styleElement) => {
    styleElement.textContent = sanitizeCssColorFunctionsForPngExport(styleElement.textContent ?? '');
  });
};

/**
 * Gathers all style and link tags from the current document's head to be inlined.
 * @returns A promise that resolves to a string of HTML style and link tags.
 */
export const gatherPageStyles = async (): Promise<string> => {
  const stylePromises = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).map(async (el) => {
    if (el.tagName === 'STYLE') {
      return `<style>${sanitizeCssColorFunctionsForPngExport(el.innerHTML)}</style>`;
    }
    if (el.tagName === 'LINK' && (el as HTMLLinkElement).rel === 'stylesheet') {
      const href = (el as HTMLLinkElement).href;

      try {
        const res = await fetch(href);
        if (!res.ok) throw new Error(res.statusText);

        // Check Content-Type to avoid inlining HTML error pages as CSS
        const contentType = res.headers.get('content-type');
        if (contentType && !contentType.includes('text/css') && !contentType.includes('application/octet-stream')) {
          logService.warn(`Skipping stylesheet ${href} due to invalid MIME: ${contentType}`);
          return '';
        }

        const css = await res.text();
        return `<style>${sanitizeCssColorFunctionsForPngExport(css)}</style>`;
      } catch (err) {
        logService.warn('Could not fetch stylesheet for export.', { href, error: err });
        // Fallback: If we can't fetch it, we ignore it rather than linking it,
        // because cross-origin links often cause taint issues in html2canvas.
        // Or we could return empty string.
        return '';
      }
    }
    return '';
  });

  return (await Promise.all(stylePromises)).join('\n');
};

/**
 * Embeds images in a cloned DOM element by converting their sources to Base64 data URIs.
 * This allows the HTML to be self-contained (offline-capable).
 * @param clone The cloned HTMLElement to process.
 */
const embedImagesInClone = async (clone: HTMLElement): Promise<void> => {
  const images = Array.from(clone.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      try {
        const src = img.getAttribute('src');
        // Skip if no src or already a data URI
        if (!src || src.startsWith('data:')) return;

        // Fetch the image content
        const response = await fetch(img.src);
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              img.src = reader.result;
              // Remove attributes that might interfere with the data URI source
              img.removeAttribute('srcset');
              img.removeAttribute('loading');
            }
            resolve();
          };
          reader.onerror = () => resolve(); // Resolve to continue even on error
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        logService.warn('Failed to embed image for export:', e);
      }
    }),
  );
};

/**
 * Creates an isolated DOM container for exporting, injecting current styles and theme.
 */
export const createSnapshotContainer = async (
  themeId: string,
  width: string = '800px',
): Promise<{ container: HTMLElement; innerContent: HTMLElement; remove: () => void; rootBgColor: string }> => {
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '0px';
  tempContainer.style.width = width;
  tempContainer.style.padding = '0';
  tempContainer.style.zIndex = '-1';
  tempContainer.style.boxSizing = 'border-box';

  const allStyles = await gatherPageStyles();
  const bodyClasses = document.body.className;

  let rootBgColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg-primary').trim();
  if (!rootBgColor) {
    rootBgColor = themeId === 'onyx' ? '#09090b' : '#FFFFFF';
  }

  tempContainer.innerHTML = `
        ${allStyles}
        <div class="theme-${themeId} ${bodyClasses} is-exporting-png" style="background-color: ${rootBgColor}; color: var(--theme-text-primary); min-height: 100vh;">
            <div style="background-color: ${rootBgColor}; padding: 0;">
                <div class="exported-chat-container" style="width: 100%; max-width: 100%; margin: 0 auto;">
                    <!-- Content will be injected here -->
                </div>
            </div>
        </div>
    `;

  document.body.appendChild(tempContainer);

  const innerContent = tempContainer.querySelector('.exported-chat-container') as HTMLElement;
  const captureTarget = tempContainer.querySelector<HTMLElement>(':scope > div');

  if (!innerContent || !captureTarget) {
    document.body.removeChild(tempContainer);
    throw new Error('Failed to create snapshot container structure');
  }

  return {
    container: captureTarget, // The element to pass to html2canvas
    innerContent, // The element to append content to
    remove: () => {
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    },
    rootBgColor,
  };
};

/**
 * Creates a standard header DOM element for exported images.
 */
export const createExportDOMHeader = (title: string, metaLeft: string, metaRight: string): HTMLElement => {
  const headerDiv = document.createElement('div');
  headerDiv.style.padding = '2rem 2rem 1rem 2rem';
  headerDiv.style.borderBottom = '1px solid var(--theme-border-secondary)';
  headerDiv.style.marginBottom = '1rem';

  const titleEl = document.createElement('h1');
  titleEl.style.fontSize = '1.5rem';
  titleEl.style.fontWeight = 'bold';
  titleEl.style.color = 'var(--theme-text-primary)';
  titleEl.style.marginBottom = '0.5rem';
  titleEl.textContent = title;

  const metaDiv = document.createElement('div');
  metaDiv.style.fontSize = '0.875rem';
  metaDiv.style.color = 'var(--theme-text-tertiary)';
  metaDiv.style.display = 'flex';
  metaDiv.style.gap = '1rem';

  const leftSpan = document.createElement('span');
  leftSpan.textContent = metaLeft;
  const separatorSpan = document.createElement('span');
  separatorSpan.textContent = '•';
  const rightSpan = document.createElement('span');
  rightSpan.textContent = metaRight;

  headerDiv.appendChild(titleEl);
  metaDiv.appendChild(leftSpan);
  metaDiv.appendChild(separatorSpan);
  metaDiv.appendChild(rightSpan);
  headerDiv.appendChild(metaDiv);

  return headerDiv;
};

/**
 * Clones, cleans, and prepares a DOM element for export (HTML or PNG).
 * Handles removing interactive elements, expanding content, embedding images,
 * and normalizing layout artifacts from virtualization.
 */
export const prepareElementForExport = async (
  sourceElement: HTMLElement,
  options: { expandDetails?: boolean } = {},
): Promise<HTMLElement> => {
  const { expandDetails = true } = options;

  // 1. Clone the container
  const clone = sourceElement.cloneNode(true) as HTMLElement;

  // 2. Fix Layout/Virtualization Artifacts
  // Ensure the container itself can grow to fit content
  clone.style.height = 'auto';
  clone.style.overflow = 'visible';
  clone.style.maxHeight = 'none';

  // Locate and fix the inner list wrapper which often has large padding-top from virtualization
  const potentialLists = Array.from(clone.children) as HTMLElement[];
  potentialLists.forEach((child) => {
    // Reset common virtualization offset techniques to ensure content starts at the top
    if (child.style.paddingTop) child.style.paddingTop = '0px';
    if (child.style.marginTop) child.style.marginTop = '0px';
    if (child.style.transform) child.style.transform = 'none';
    if (child.style.position === 'absolute') child.style.position = 'static';
  });

  // 3. Clean UI elements that shouldn't be in the export
  const selectorsToRemove = [
    'button',
    '.message-actions',
    '.sticky',
    'input',
    'textarea',
    '.code-block-utility-button',
    '[role="tooltip"]',
    '.loading-dots-container',
  ];
  clone.querySelectorAll(selectorsToRemove.join(',')).forEach((el) => el.remove());

  // 4. Reset styles that might interfere with static export
  clone.querySelectorAll('[data-message-id]').forEach((el) => {
    (el as HTMLElement).style.animation = 'none';
    (el as HTMLElement).style.opacity = '1';
    (el as HTMLElement).style.transform = 'none';
  });

  if (expandDetails) {
    // Image Export Specifics

    // 5a. Remove thought process blocks entirely (as requested)
    clone.querySelectorAll('.message-thoughts-block').forEach((el) => el.remove());

    // 5b. Remove code block expansion controls
    clone.querySelectorAll('.code-block-expand-overlay').forEach((el) => el.remove());

    // 5c. Force expand all code blocks (show full content)
    clone.querySelectorAll('pre').forEach((el) => {
      (el as HTMLElement).style.maxHeight = 'none';
      (el as HTMLElement).style.height = 'auto';
      (el as HTMLElement).style.overflow = 'visible';
    });

    // 5d. Expand other native details elements so they are visible in snapshot
    clone.querySelectorAll('details').forEach((el) => el.setAttribute('open', 'true'));
  } else {
    // HTML Export Specifics

    // 5. Ensure native details are collapsed by default (remove 'open' if present from clone)
    clone.querySelectorAll('details').forEach((el) => el.removeAttribute('open'));

    // 6. Convert custom thought accordions to native details for interactive collapse/expand
    clone.querySelectorAll('.thought-process-accordion').forEach((accordion) => {
      const parent = accordion.parentElement;
      if (!parent) return;

      const header = parent.firstElementChild as HTMLElement;
      if (!header || header === accordion) return;

      // Create new <details> structure
      const details = document.createElement('details');
      details.className = parent.className; // Preserve layout styling

      const summary = document.createElement('summary');
      summary.className = header.className;
      summary.style.cursor = 'pointer';
      summary.style.listStyle = 'none';

      // Hide default webkit marker
      const style = document.createElement('style');
      style.textContent = 'summary::-webkit-details-marker { display: none; }';
      summary.appendChild(style);

      // Move header content to summary
      while (header.firstChild) {
        summary.appendChild(header.firstChild);
      }

      // Fix Chevron Rotation logic: Replace fixed state with group-open modifier
      const svg = summary.querySelector('svg');
      if (svg && svg.classList.contains('transition-transform')) {
        svg.classList.remove('rotate-180'); // Ensure start closed
        svg.classList.add('group-open:rotate-180'); // Use Tailwind peer/group modifier for native state
      }

      // Move Content
      const inner = accordion.querySelector('.thought-process-inner') || accordion;
      const contentWrapper = document.createElement('div');
      contentWrapper.className = inner.className;

      while (inner.firstChild) {
        contentWrapper.appendChild(inner.firstChild);
      }

      details.appendChild(summary);
      details.appendChild(contentWrapper);

      parent.replaceWith(details);
    });
  }

  // 7. Embed Images: Convert blob/url images to Base64
  await embedImagesInClone(clone);

  return clone;
};
