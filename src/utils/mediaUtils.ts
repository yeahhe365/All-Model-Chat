
/**
 * Captures the current screen content as an image Blob.
 * Handles browser support checks, stream acquisition, and fallback to video element capture.
 */
type WindowWithImageCapture = Window & typeof globalThis & {
    ImageCapture?: new (track: MediaStreamTrack) => { grabFrame: () => Promise<ImageBitmap> };
};

type DisplayMediaVideoConstraints = MediaTrackConstraints & {
    mediaSource?: 'screen' | 'window' | 'application' | 'browser';
};

export const captureScreenImage = async (): Promise<Blob | null> => {
    if (!('getDisplayMedia' in navigator.mediaDevices)) {
        alert("Your browser does not support screen capture.");
        return null;
    }

    let stream: MediaStream;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: { mediaSource: "screen" } as DisplayMediaVideoConstraints,
            audio: false,
        });
    } catch (err) {
        console.error("Error starting screen capture:", err);
        if ((err as DOMException).name !== 'NotAllowedError') {
            alert(`Could not start screen capture: ${(err as Error).message}`);
        }
        return null;
    }
    
    const track = stream.getVideoTracks()[0];
    if (!track) {
        console.error("No video track found in the stream.");
        stream.getTracks().forEach(t => t.stop());
        return null;
    }

    return new Promise<Blob | null>((resolve) => {
        const cleanup = () => stream.getTracks().forEach(t => t.stop());

        const processBitmap = (bitmap: ImageBitmap) => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const context = canvas.getContext('2d');
                context?.drawImage(bitmap, 0, 0);
                canvas.toBlob((blob) => {
                    cleanup();
                    resolve(blob);
                }, 'image/png');
            } catch (e) {
                console.error("Error drawing bitmap:", e);
                cleanup();
                resolve(null);
            }
        };

        // Attempt to use ImageCapture API (Chrome/Edge)
        const ImageCaptureCtor = (window as WindowWithImageCapture).ImageCapture;
        if (ImageCaptureCtor) {
            const imageCapture = new ImageCaptureCtor(track) as unknown as { grabFrame: () => Promise<ImageBitmap> };
            imageCapture.grabFrame()
                .then(processBitmap)
                .catch((err: unknown) => {
                    console.warn("ImageCapture failed, falling back to video element:", err);
                    fallbackToVideo();
                });
        } else {
            fallbackToVideo();
        }

        function fallbackToVideo() {
            try {
                const video = document.createElement('video');
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play();
                    // Slight delay to ensure frame is rendered
                    setTimeout(() => {
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const context = canvas.getContext('2d');
                        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
                        canvas.toBlob((blob) => {
                            cleanup();
                            video.remove();
                            resolve(blob);
                        }, 'image/png');
                    }, 150);
                };
                video.onerror = () => {
                    cleanup();
                    resolve(null);
                };
            } catch (e) {
                console.error("Video fallback failed:", e);
                cleanup();
                resolve(null);
            }
        }
    });
};
