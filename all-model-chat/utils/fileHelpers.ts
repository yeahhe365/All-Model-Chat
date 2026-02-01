
import { MIME_TO_EXTENSION_MAP } from '../constants/fileConstants';

export const decodeBase64ToArrayBuffer = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            if (base64Data) {
                resolve(base64Data);
            } else {
                reject(new Error("Failed to extract base64 data from file."));
            }
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

export const fileToString = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
    });
};

export const fileToBlobUrl = (file: File): string => {
    return URL.createObjectURL(file);
};

export const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteArray = decodeBase64ToArrayBuffer(base64);
    return new Blob([byteArray], { type: mimeType });
};

export const base64ToBlobUrl = (base64: string, mimeType: string): string => {
    const blob = base64ToBlob(base64, mimeType);
    return URL.createObjectURL(blob);
};

export const getExtensionFromMimeType = (mimeType: string): string => {
    if (MIME_TO_EXTENSION_MAP[mimeType]) return MIME_TO_EXTENSION_MAP[mimeType];
    
    // Fallback logic for generic types (image/xyz -> .xyz)
    if (mimeType.startsWith('image/') || mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
        const subtype = mimeType.split('/')[1];
        if (subtype) return `.${subtype}`;
    }
    
    return '.file';
};

export const formatFileSize = (sizeInBytes: number): string => {
    if (!sizeInBytes) return '';
    if (sizeInBytes < 1024) return `${Math.round(sizeInBytes)} B`;
    const sizeInKb = sizeInBytes / 1024;
    if (sizeInKb < 1024) return `${sizeInKb.toFixed(1)} KB`;
    const sizeInMb = sizeInKb / 1024;
    return `${sizeInMb.toFixed(2)} MB`;
};

export const cleanupFilePreviewUrls = (files: { dataUrl?: string }[] | undefined) => {
    files?.forEach(f => {
         if (f.dataUrl && f.dataUrl.startsWith('blob:')) {
             URL.revokeObjectURL(f.dataUrl);
         }
    });
};