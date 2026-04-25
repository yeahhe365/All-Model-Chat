import type { pdfjs } from 'react-pdf';

export const PDF_WORKER_SRC = '/pdf.worker.min.mjs';

export const configurePdfWorker = (targetPdfjs: Pick<typeof pdfjs, 'GlobalWorkerOptions'>) => {
  targetPdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
};
