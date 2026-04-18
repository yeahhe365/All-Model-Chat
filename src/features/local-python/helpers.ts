import type { ChatMessage, UploadedFile } from '../../types';

const PYTHON_BLOCK_REGEX = /```(?:python|py)\s*([\s\S]*?)\s*```/gi;

export const createLocalPythonExecutionSignature = (code: string) => code.trim();

export const getLatestPythonCodeBlock = (content: string): string | null => {
  let latestCode: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = PYTHON_BLOCK_REGEX.exec(content)) !== null) {
    const code = match[1]?.trim();
    if (code) {
      latestCode = code;
    }
  }

  return latestCode;
};

export const getLatestLocalPythonExecutionCandidate = ({
  messageId,
  content,
  processedSignatures,
}: {
  messageId: string;
  content: string;
  processedSignatures: Map<string, string>;
}) => {
  const code = getLatestPythonCodeBlock(content);
  if (!code) {
    return null;
  }

  const signature = createLocalPythonExecutionSignature(code);
  if (processedSignatures.get(messageId) === signature) {
    return null;
  }

  return { code, signature };
};

export const collectLocalPythonInputFiles = (
  messages: ChatMessage[],
  targetMessageId: string,
) => {
  const targetIndex = messages.findIndex((message) => message.id === targetMessageId);
  const contextMessages = targetIndex === -1 ? messages : messages.slice(0, targetIndex);
  const inputFiles = new Map<string, UploadedFile>();

  for (const message of contextMessages) {
    if (message.role !== 'user' || !message.files?.length) {
      continue;
    }

    for (const file of message.files) {
      const isGeneratedOutput =
        file.name.startsWith('generated-') || file.name.startsWith('edited-');
      const isActive = file.uploadState === undefined || file.uploadState === 'active';
      if (!file.rawFile || !isActive || file.error || isGeneratedOutput) {
        continue;
      }

      inputFiles.set(file.id, file);
    }
  }

  return Array.from(inputFiles.values());
};

export const hasGeneratedImageFile = (
  files: Array<{ type: string }>,
) => files.some((file) => file.type.startsWith('image/'));
