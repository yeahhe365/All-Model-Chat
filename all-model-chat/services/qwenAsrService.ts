import { logService } from "./logService";

const API_URL = 'https://c0rpr74ughd0-deploy.space.z.ai/api/asr-inference';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove "data:*/*;base64," prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const transcribeWithQwen = async (
    audioFile: File,
    context: string,
    language: string,
    enableItn: boolean,
): Promise<string> => {
    logService.info('Transcribing with Qwen ASR', { file: audioFile.name, context, language, enableItn });

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const base64Data = await fileToBase64(audioFile);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio_file: {
                        data: base64Data,
                        name: audioFile.name,
                        type: audioFile.type,
                        size: audioFile.size
                    },
                    context: context,
                    language: language,
                    enable_itn: enableItn,
                }),
            });

            if (!response.ok) {
                throw new Error(`Qwen ASR API request failed with status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success && result.data && Array.isArray(result.data) && result.data.length >= 1) {
                const transcription = result.data[0] as string || '';
                logService.info('Qwen ASR transcription successful.');
                return transcription;
            } else if (result.error) {
                throw new Error(result.details || result.error);
            } else {
                throw new Error('Invalid response format from Qwen ASR API');
            }
        } catch (error) {
            logService.error(`Qwen ASR attempt ${i + 1} failed.`, { error });
            if (i === MAX_RETRIES - 1) {
                throw new Error(`Transcription with Qwen ASR failed after ${MAX_RETRIES} attempts. ${error instanceof Error ? error.message : String(error)}`);
            }
            const delay = INITIAL_BACKOFF_MS * Math.pow(2, i);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    // This should not be reachable.
    throw new Error('Transcription with Qwen ASR failed after all retries.');
};
