import { createManagedObjectUrl, releaseManagedObjectUrl } from '../services/objectUrlManager';

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const DOCX_WORKER_CODE = `
self.onmessage = async function(e) {
    try {
        const file = e.data;
        const arrayBuffer = await file.arrayBuffer();

        const mammothModule = await import('https://esm.sh/mammoth@1.6.0');
        const mammoth = mammothModule.default || mammothModule;

        const result = await mammoth.extractRawText({ arrayBuffer });
        self.postMessage({ type: 'success', text: result.value, messages: result.messages });
    } catch (err) {
        self.postMessage({ type: 'error', error: err.message });
    }
};
`;

interface ExtractDocxTextResult {
  text: string;
  messages: string[];
}

export const isDocxFile = (file: { name: string; type: string }) => {
  return file.type === DOCX_MIME_TYPE || file.name.toLowerCase().endsWith('.docx');
};

export const extractDocxText = async (file: Blob): Promise<ExtractDocxTextResult> => {
  return new Promise<ExtractDocxTextResult>((resolve, reject) => {
    const blob = new Blob([DOCX_WORKER_CODE], { type: 'application/javascript' });
    const workerUrl = createManagedObjectUrl(blob);
    const worker = new Worker(workerUrl, { type: 'module' });

    const cleanup = () => {
      worker.terminate();
      releaseManagedObjectUrl(workerUrl);
    };

    worker.onmessage = (event) => {
      if (event.data.type === 'success') {
        resolve({
          text: event.data.text,
          messages: Array.isArray(event.data.messages) ? event.data.messages : [],
        });
      } else {
        reject(new Error(event.data.error));
      }

      cleanup();
    };

    worker.onerror = (error) => {
      reject(error);
      cleanup();
    };

    worker.postMessage(file);
  });
};
