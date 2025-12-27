import { triggerDownload } from './core';

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

    // Pre-load images to ensure they render
    const images = Array.from(element.querySelectorAll('img'));
    await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // Don't block export on broken image
        });
    }));

    // Force a layout recalc/paint wait to ensure styles are applied in the detached container
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(element, {
        height: element.scrollHeight,
        width: element.scrollWidth,
        useCORS: true, // Important for cross-origin images
        allowTaint: true,
        logging: false,
        backgroundColor: options?.backgroundColor ?? null,
        scale: options?.scale ?? 2, // Default to 2x for Retina sharpness
        ignoreElements: (el) => {
            // Fallback check for ignoring elements if CSS fails
            return el.classList.contains('no-export'); 
        }
    });
    
    // Convert to Blob to handle larger images better than data URI
    canvas.toBlob((blob) => {
        if (blob) {
            const url = URL.createObjectURL(blob);
            triggerDownload(url, filename);
        } else {
            console.error("Canvas to Blob conversion failed");
        }
    }, 'image/png');
};

/**
 * Converts an SVG string to a PNG data URL and triggers a download.
 * @param svgString The string content of the SVG.
 * @param filename The desired filename for the downloaded PNG.
 * @param scale The resolution scale factor for the output PNG.
 */
export const exportSvgAsPng = async (svgString: string, filename: string, scale: number = 3): Promise<void> => {
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    const img = new Image();

    return new Promise((resolve, reject) => {
        img.onload = () => {
            const imgWidth = img.width;
            const imgHeight = img.height;

            if (imgWidth === 0 || imgHeight === 0) {
                return reject(new Error("Diagram has zero dimensions, cannot export."));
            }
            const canvas = document.createElement('canvas');
            canvas.width = imgWidth * scale;
            canvas.height = imgHeight * scale;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.drawImage(img, 0, 0, imgWidth * scale, imgHeight * scale);
                const pngUrl = canvas.toDataURL('image/png');
                triggerDownload(pngUrl, filename);
                resolve();
            } else {
                reject(new Error("Could not get canvas context."));
            }
        };

        img.onerror = () => {
            reject(new Error("Failed to load SVG into an image element for conversion."));
        };

        img.src = svgDataUrl;
    });
};