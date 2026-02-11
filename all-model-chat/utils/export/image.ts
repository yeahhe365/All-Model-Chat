
import { triggerDownload } from './core';
import { createSnapshotContainer, createExportDOMHeader } from './dom';

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
        allowTaint: false, // Changed to false to prevent tainting the canvas which blocks toBlob()
        logging: false,
        backgroundColor: options?.backgroundColor ?? null,
        scale: options?.scale ?? 2, // Default to 2x for Retina sharpness
        ignoreElements: (el) => {
            // Fallback check for ignoring elements if CSS fails
            return el.classList.contains('no-export'); 
        }
    });
    
    // Convert to Blob to handle larger images better than data URI
    return new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                triggerDownload(url, filename);
                resolve();
            } else {
                console.error("Canvas to Blob conversion failed");
                reject(new Error("Image export failed. The content may be too large or contain protected images."));
            }
        }, 'image/png');
    });
};

/**
 * Orchestrates the full process of creating a snapshot container, injecting a header,
 * capturing the content, and downloading the PNG.
 */
export const generateSnapshotPng = async (
    contentElement: HTMLElement,
    filename: string,
    themeId: string,
    headerConfig: { title: string; metaLeft: string; metaRight: string },
    options: { width?: string; scale?: number } = {}
) => {
    let cleanup = () => { };
    try {
        const { container, innerContent, remove, rootBgColor } = await createSnapshotContainer(
            themeId,
            options.width || '800px'
        );
        cleanup = remove;

        // Create header using shared helper
        const headerDiv = createExportDOMHeader(headerConfig.title, headerConfig.metaLeft, headerConfig.metaRight);
        innerContent.appendChild(headerDiv);

        const bodyDiv = document.createElement('div');
        bodyDiv.style.padding = '0 2rem 2rem 2rem';
        bodyDiv.appendChild(contentElement);
        innerContent.appendChild(bodyDiv);
        
        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 800)); 

        await exportElementAsPng(container, filename, {
            backgroundColor: rootBgColor,
            scale: options.scale || 2, 
        });

    } finally {
        cleanup();
    }
};

/**
 * Converts an SVG string to an image data URL and triggers a download.
 * Enhanced logic parses the SVG, calculates dimensions from viewBox/attributes,
 * and explicitly sets high-res attributes on the SVG node to ensure crisp rasterization.
 * 
 * @param svgString The string content of the SVG.
 * @param filename The desired filename for the downloaded image.
 * @param scale The resolution scale factor for the output image.
 * @param mimeType The MIME type of the output image (e.g., 'image/png', 'image/jpeg').
 * @param backgroundColor Optional background color (e.g., '#FFFFFF'). Defaults to white for JPEG, transparent for PNG.
 */
export const exportSvgAsImage = async (
    svgString: string, 
    filename: string, 
    scale: number = 3,
    mimeType: string = 'image/png',
    backgroundColor?: string
): Promise<void> => {
    // 1. Parse SVG to modify dimensions
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgElement = doc.documentElement;

    if (svgElement.tagName.toLowerCase() !== 'svg') {
        throw new Error("Invalid SVG string");
    }

    // 2. Determine base dimensions
    // Priority: explicit width/height -> viewBox -> default fallback
    let width = parseFloat(svgElement.getAttribute('width') || '0');
    let height = parseFloat(svgElement.getAttribute('height') || '0');
    const viewBox = svgElement.getAttribute('viewBox');

    if ((!width || !height) && viewBox) {
        const parts = viewBox.split(/\s+|,/).filter(Boolean).map(parseFloat);
        if (parts.length === 4) {
            width = parts[2];
            height = parts[3];
        }
    }

    // Fallback if no dimensions found
    if (!width || !height) {
        width = 300; 
        height = 150;
    }

    // 3. Set scaled dimensions on the SVG element
    // This forces the browser to rasterize the SVG at high resolution when loading the Image
    const scaledWidth = Math.ceil(width * scale);
    const scaledHeight = Math.ceil(height * scale);

    svgElement.setAttribute('width', scaledWidth.toString());
    svgElement.setAttribute('height', scaledHeight.toString());
    
    // Reset CSS constraints that might interfere with intrinsic sizing
    svgElement.style.width = '';
    svgElement.style.height = '';
    svgElement.style.maxWidth = '';
    svgElement.style.maxHeight = '';

    // 4. Serialize back to string
    const serializer = new XMLSerializer();
    const scaledSvgString = serializer.serializeToString(svgElement);

    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(scaledSvgString)}`;
    const img = new Image();

    // 5. Draw to canvas
    return new Promise((resolve, reject) => {
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                // Handle background color
                if (backgroundColor) {
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else if (mimeType === 'image/jpeg') {
                    // Force white background for JPG to prevent black transparent areas
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                // Draw at 1:1 of the scaled image
                ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
                
                try {
                    const dataUrl = canvas.toDataURL(mimeType);
                    triggerDownload(dataUrl, filename);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            } else {
                reject(new Error("Could not get canvas context."));
            }
        };

        img.onerror = () => {
            reject(new Error("Failed to load SVG into image element."));
        };

        img.src = svgDataUrl;
    });
};
