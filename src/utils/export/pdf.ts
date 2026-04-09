export interface Html2PdfChain {
  set: (options: unknown) => Html2PdfChain;
  from: (element: HTMLElement) => Html2PdfChain;
  output: (type: 'blob') => Promise<Blob>;
  save: () => Promise<void>;
}

export type Html2PdfFactory = () => Html2PdfChain;

const nextAnimationFrame = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

const getWindowHtml2Pdf = () =>
  (window as Window & { html2pdf?: Html2PdfFactory }).html2pdf;

const waitForImages = async (root: HTMLElement) => {
  const images = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    images.map((image) => {
      if (image.complete) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    })
  );
};

const waitForFonts = async () => {
  if ('fonts' in document) {
    await (document as Document & { fonts: FontFaceSet }).fonts.ready;
  }
};

const hasPendingExportWork = (root: HTMLElement) =>
  !!root.querySelector('[data-export-pending="true"], [aria-busy="true"]');

export const loadHtml2PdfFactory = async (): Promise<Html2PdfFactory> => {
  const existingFactory = getWindowHtml2Pdf();
  if (existingFactory) {
    return existingFactory;
  }

  const module = await import('html2pdf.js');
  const factory = module.default;

  if (!factory) {
    throw new Error('PDF export library failed to load.');
  }

  return factory;
};

export const waitForElementToBecomeStable = async (
  root: HTMLElement,
  options: { idleMs?: number; timeoutMs?: number } = {}
) => {
  const idleMs = options.idleMs ?? 250;
  const timeoutMs = options.timeoutMs ?? 8000;

  if (!root.isConnected) {
    throw new Error('PDF preview is not mounted.');
  }

  await waitForFonts();
  await nextAnimationFrame();
  await nextAnimationFrame();

  await new Promise<void>((resolve, reject) => {
    let settledTimer: number | undefined;
    let timeoutTimer: number | undefined;

    const cleanup = () => {
      if (settledTimer !== undefined) {
        window.clearTimeout(settledTimer);
      }
      if (timeoutTimer !== undefined) {
        window.clearTimeout(timeoutTimer);
      }
      observer.disconnect();
    };

    const finish = async () => {
      if (hasPendingExportWork(root)) {
        schedule();
        return;
      }

      await waitForImages(root);

      if (hasPendingExportWork(root)) {
        schedule();
        return;
      }

      cleanup();
      await nextAnimationFrame();
      await nextAnimationFrame();
      resolve();
    };

    const schedule = () => {
      if (settledTimer !== undefined) {
        window.clearTimeout(settledTimer);
      }
      settledTimer = window.setTimeout(() => {
        void finish().catch((error) => {
          cleanup();
          reject(error);
        });
      }, idleMs);
    };

    const observer = new MutationObserver(() => {
      schedule();
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });

    timeoutTimer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for the PDF preview to finish rendering.'));
    }, timeoutMs);

    schedule();
  });
};
