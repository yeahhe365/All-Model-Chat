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
 * Embeds images in a cloned DOM element by converting their sources to Base64 data URIs.
 * This allows the HTML to be self-contained (offline-capable).
 * @param clone The cloned HTMLElement to process.
 */
export const embedImagesInClone = async (clone: HTMLElement): Promise<void> => {
    const images = Array.from(clone.querySelectorAll('img'));
    await Promise.all(images.map(async (img) => {
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
            console.warn('Failed to embed image for export:', e);
        }
    }));
};

/**
 * Creates an isolated DOM container for exporting, injecting current styles and theme.
 */
export const createSnapshotContainer = async (
    themeId: string,
    width: string = '800px'
): Promise<{ container: HTMLElement, innerContent: HTMLElement, remove: () => void, rootBgColor: string }> => {
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
    
    // Explicitly get the background color. 
    // We trim whitespace and provide a fallback to ensure html2canvas has a valid color.
    // If we rely solely on transparency + CSS variables in the clone, html2canvas often defaults to white background
    // but effectively transparent, which looks white in many viewers if the text is white.
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
        throw new Error("Failed to create snapshot container structure");
    }

    return {
        container: captureTarget, // The element to pass to html2canvas
        innerContent,             // The element to append content to
        remove: () => {
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
        },
        rootBgColor
    };
};