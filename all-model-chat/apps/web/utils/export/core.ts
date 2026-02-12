/**
 * Triggers a file download in the browser.
 * @param href The URL or data URI of the file to download.
 * @param filename The desired name of the file.
 * @param revokeBlob Whether to revoke the object URL after download (if it is a blob URL). Defaults to true.
 */
export const triggerDownload = (href: string, filename: string, revokeBlob: boolean = true): void => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (revokeBlob && href.startsWith('blob:')) {
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