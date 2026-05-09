/**
 * Captures the current screen content as an image Blob.
 * Handles browser support checks, stream acquisition, and fallback to video element capture.
 */
type WindowWithImageCapture = Window &
  typeof globalThis & {
    ImageCapture?: new (track: MediaStreamTrack) => { grabFrame: () => Promise<ImageBitmap> };
  };

type DisplayMediaVideoConstraints = MediaTrackConstraints & {
  mediaSource?: 'screen' | 'window' | 'application' | 'browser';
};

interface ScreenCaptureMessages {
  unsupported: string;
  startFailed: (message: string) => string;
}

export const captureScreenImage = async (messages: ScreenCaptureMessages): Promise<Blob | null> => {
  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.getDisplayMedia) {
    alert(messages.unsupported);
    return null;
  }

  let stream: MediaStream;
  try {
    stream = await mediaDevices.getDisplayMedia({
      video: { mediaSource: 'screen' } as DisplayMediaVideoConstraints,
      audio: false,
    });
  } catch (err) {
    console.error('Error starting screen capture:', err);
    if ((err as DOMException).name !== 'NotAllowedError') {
      alert(messages.startFailed((err as Error).message));
    }
    return null;
  }

  const track = stream.getVideoTracks()[0];
  if (!track) {
    console.error('No video track found in the stream.');
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }

  return new Promise<Blob | null>((resolve) => {
    let isSettled = false;
    const cleanup = () => stream.getTracks().forEach((t) => t.stop());
    const finish = (blob: Blob | null) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      cleanup();
      resolve(blob);
    };

    const processBitmap = (bitmap: ImageBitmap) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (!context || canvas.width === 0 || canvas.height === 0) {
          finish(null);
          return;
        }
        context.drawImage(bitmap, 0, 0);
        canvas.toBlob((blob) => {
          finish(blob);
        }, 'image/png');
      } catch (e) {
        console.error('Error drawing bitmap:', e);
        finish(null);
      }
    };

    // Attempt to use ImageCapture API (Chrome/Edge)
    const ImageCaptureCtor = (window as WindowWithImageCapture).ImageCapture;
    if (ImageCaptureCtor) {
      const imageCapture = new ImageCaptureCtor(track) as unknown as { grabFrame: () => Promise<ImageBitmap> };
      imageCapture
        .grabFrame()
        .then(processBitmap)
        .catch((err: unknown) => {
          console.warn('ImageCapture failed, falling back to video element:', err);
          fallbackToVideo();
        });
    } else {
      fallbackToVideo();
    }

    function fallbackToVideo() {
      let video: HTMLVideoElement | null = null;
      let metadataTimeout: number | undefined;
      const clearFallbackTimeout = () => {
        if (metadataTimeout !== undefined) {
          window.clearTimeout(metadataTimeout);
          metadataTimeout = undefined;
        }
      };
      const removeVideo = () => {
        clearFallbackTimeout();
        video?.pause();
        video?.remove();
        video = null;
      };

      const fail = (error?: unknown) => {
        if (error) {
          console.warn('Video fallback failed:', error);
        }
        removeVideo();
        finish(null);
      };

      try {
        video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        metadataTimeout = window.setTimeout(() => {
          fail(new Error('Timed out waiting for captured video metadata.'));
        }, 3000);
        video.onloadedmetadata = async () => {
          try {
            if (!video) {
              finish(null);
              return;
            }

            await video.play();
            await new Promise((painted) => requestAnimationFrame(painted));

            if (!video.videoWidth || !video.videoHeight) {
              fail(new Error('Captured video stream did not provide a drawable frame.'));
              return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (!context) {
              fail(new Error('Could not create canvas context for screenshot.'));
              return;
            }

            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
              removeVideo();
              finish(blob);
            }, 'image/png');
          } catch (error) {
            fail(error);
          }
        };
        video.onerror = () => fail();
      } catch (e) {
        fail(e);
      }
    }
  });
};
