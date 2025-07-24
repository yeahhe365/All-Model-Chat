
/**
 * Triggers a file download in the browser.
 * @param href The URL or data URI of the file to download.
 * @param filename The desired name of the file.
 */
export const triggerDownload = (href: string, filename: string): void => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (href.startsWith('blob:')) {
        URL.revokeObjectURL(href);
    }
};

/**
 * Sanitizes a string to be used as a filename.
 * @param name The original string to sanitize.
 * @returns A filesystem-safe filename string.
 */
export const sanitizeFilename = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return "export";
  }
  // Remove illegal characters for filenames and control characters
  let saneName = name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  // Windows doesn't like filenames ending with a period or space.
  saneName = saneName.replace(/[. ]+$/, '');
  // Limit length to avoid issues with filesystems
  if (saneName.length > 100) {
    saneName = saneName.substring(0, 100);
  }
  return saneName || "export";
};

/**
 * Gathers all style and link tags from the current document's head to be inlined.
 * @returns A promise that resolves to a string of HTML style and link tags.
 */
export const gatherPageStyles = async (): Promise<string> => {
    const stylePromises = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => {
            if (el.tagName === 'STYLE') {
                return Promise.resolve(`<style>${el.innerHTML}</style>`);
            }
            if (el.tagName === 'LINK' && (el as HTMLLinkElement).rel === 'stylesheet') {
                // Fetch external stylesheets to inline them
                return fetch((el as HTMLLinkElement).href)
                    .then(res => {
                        if (!res.ok) throw new Error(`Failed to fetch stylesheet: ${res.statusText}`);
                        return res.text();
                    })
                    .then(css => `<style>${css}</style>`)
                    .catch(err => {
                        console.warn('Could not fetch stylesheet for export:', (el as HTMLLinkElement).href, err);
                        return el.outerHTML; // Fallback to linking the stylesheet
                    });
            }
            return Promise.resolve('');
        });

    return (await Promise.all(stylePromises)).join('\n');
};

/**
 * Exports a given HTML element as a PNG image.
 * @param element The HTML element to capture.
 * @param filename The desired filename for the downloaded PNG.
 * @param options Configuration options for html2canvas.
 */
export const exportElementAsPng = async (
    element: HTMLElement, 
    filename: string,
    options?: { backgroundColor?: string | null, scale?: number }
) => {
    const html2canvas = (await import('html2canvas')).default;

    // Wait for images inside the element to load before capturing
    const images = element.querySelectorAll('img');
    const imageLoadPromises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = img.onerror = resolve; });
    });
    await Promise.all(imageLoadPromises);
    await new Promise(resolve => setTimeout(resolve, 250)); // Small delay for rendering final styles

    const canvas = await html2canvas(element, {
        height: element.scrollHeight,
        width: element.scrollWidth,
        useCORS: true,
        backgroundColor: options?.backgroundColor,
        scale: options?.scale ?? 2,
    });
    triggerDownload(canvas.toDataURL('image/png'), filename);
};


/**
 * Exports a string of HTML content as an .html file.
 * @param htmlContent The full HTML document string.
 * @param filename The desired filename.
 */
export const exportHtmlStringAsFile = (htmlContent: string, filename:string) => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    triggerDownload(URL.createObjectURL(blob), filename);
};

/**
 * Exports a string of text content as a .txt file.
 * @param textContent The text content to save.
 * @param filename The desired filename.
 */
export const exportTextStringAsFile = (textContent: string, filename: string) => {
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    triggerDownload(URL.createObjectURL(blob), filename);
};
