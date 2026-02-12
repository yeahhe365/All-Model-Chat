
import type {
    SpeechGenerationRequest,
    SpeechGenerationResponse,
    TranscribeAudioRequest,
    TranscribeAudioResponse,
} from '@all-model-chat/shared-api';
import { fetchBffJson } from '../bffApi';
import { logService } from "../../logService";
import { blobToBase64 } from "../../../utils/appUtils";

export const generateSpeechApi = async (apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal): Promise<string> => {
    void apiKey;
    logService.info(`Generating speech with model ${modelId}`, { textLength: text.length, voice });
    
    if (!text.trim()) {
        throw new Error("TTS input text cannot be empty.");
    }

    try {
        const requestPayload: SpeechGenerationRequest = {
            model: modelId,
            text,
            voice,
        };

        const response = await fetchBffJson<SpeechGenerationResponse>(
            '/api/generation/speech',
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
            },
            abortSignal
        );

        if (abortSignal.aborted) {
            const abortError = new Error("Speech generation cancelled by user.");
            abortError.name = "AbortError";
            throw abortError;
        }

        const audioData = response.audioData;

        if (typeof audioData === 'string' && audioData.length > 0) {
            return audioData;
        }

        throw new Error('No audio data found in TTS response.');

    } catch (error) {
        logService.error(`Failed to generate speech with model ${modelId}:`, error);
        throw error;
    }
};

export const transcribeAudioApi = async (apiKey: string, audioFile: File, modelId: string): Promise<string> => {
    void apiKey;
    logService.info(`Transcribing audio with model ${modelId}`, { fileName: audioFile.name, size: audioFile.size });
    
    try {
        // Use blobToBase64 which is efficient and handles Blobs/Files
        const audioBase64 = await blobToBase64(audioFile);
        const requestPayload: TranscribeAudioRequest = {
            model: modelId,
            mimeType: audioFile.type,
            audioBase64,
        };
        const response = await fetchBffJson<TranscribeAudioResponse>(
            '/api/generation/transcribe',
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
            }
        );

        if (response.text) {
            return response.text;
        } else {
            throw new Error("Transcription failed. The model returned an empty response.");
        }
    } catch (error) {
        logService.error("Error during audio transcription:", error);
        throw error;
    }
};
