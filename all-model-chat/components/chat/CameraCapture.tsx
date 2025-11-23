
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, SwitchCamera, Loader2 } from 'lucide-react';
import { useWindowContext } from '../../contexts/WindowContext';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const { document: targetDocument } = useWindowContext();

  // Check for multiple video input devices
  useEffect(() => {
    const checkDevices = async () => {
        try {
            // Ensure permissions are requested first if possible, or just enumerate
            // Note: Labels might be empty if permission isn't granted yet, but device IDs/kinds are usually there.
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setHasMultipleCameras(videoDevices.length > 1);
        } catch (e) {
            console.warn("Error checking camera devices:", e);
        }
    };
    checkDevices();
  }, []);

  useEffect(() => {
    let active = true;
    let mediaStream: MediaStream | null = null;

    const startCamera = async () => {
      setIsVideoReady(false);
      setError(null);

      // Clean up previous stream if any
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 4096 },
            height: { ideal: 2160 }
          },
          audio: false
        };
        
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (active) {
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } else {
            mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        // Fallback: try generic constraints
        if (active) {
            try {
                console.log("Falling back to default video constraints");
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                if (active) {
                    setStream(mediaStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                    }
                } else {
                    mediaStream.getTracks().forEach(track => track.stop());
                }
            } catch (fallbackErr) {
                if (active) setError("Could not access the camera. Please check permissions.");
            }
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Cleanup stream on unmount if component is removed while stream is active
  useEffect(() => {
      return () => {
          if (stream) {
              stream.getTracks().forEach(track => track.stop());
          }
      };
  }, [stream]);

  const handleVideoLoaded = () => {
      setIsVideoReady(true);
  };

  const toggleCamera = () => {
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleCapture = useCallback(() => {
    if (isCapturing || !videoRef.current || !canvasRef.current || !isVideoReady) return;
    
    setIsCapturing(true);
    setIsFlashing(true);
    
    // Reset flash after animation
    setTimeout(() => setIsFlashing(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match the actual video stream resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      // If using front camera, mirror the captured image horizontally
      if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `photo-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          
          // Short delay to let the flash animation play before closing
          setTimeout(() => {
              onCapture(file);
          }, 200);
        } else {
          setError("Failed to capture image.");
          setIsCapturing(false);
        }
      }, 'image/jpeg', 0.95);
    }
  }, [isCapturing, isVideoReady, facingMode, onCapture]);

  return createPortal(
    <div 
      className="fixed inset-0 bg-black z-[2100] flex flex-col touch-none"
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="camera-capture-title"
    >
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
        <div />
        <button 
            onClick={onCancel} 
            className="p-2 rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-black/40 transition-colors"
            aria-label="Close camera"
        >
            <X size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* Main Camera View */}
      <div className="relative flex-grow bg-black flex items-center justify-center overflow-hidden">
        {error ? (
            <div className="text-white text-center p-6 bg-neutral-900/80 rounded-xl backdrop-blur-sm max-w-sm mx-4">
                <p className="mb-2 text-red-400 font-medium">Camera Error</p>
                <p className="text-sm text-neutral-300">{error}</p>
                <button onClick={onCancel} className="mt-4 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm transition-colors">Close</button>
            </div>
        ) : (
            <>
                {!isVideoReady && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Loader2 size={40} className="text-white/50 animate-spin" />
                    </div>
                )}
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    onLoadedMetadata={handleVideoLoaded}
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} transition-opacity duration-300 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}
                ></video>
                
                {/* Flash Overlay */}
                <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-100 ease-out ${isFlashing ? 'opacity-100' : 'opacity-0'}`} />
            </>
        )}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 z-20 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        {/* Placeholder for layout balance */}
        <div className="w-12 h-12" />

        {/* Shutter Button */}
        <button 
            onClick={handleCapture} 
            disabled={!isVideoReady || isCapturing || !!error}
            className="group relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Take photo"
        >
            <div className="w-16 h-16 bg-white rounded-full transition-all group-active:scale-90" />
        </button>

        {/* Camera Switch */}
        <div className="w-12 h-12 flex items-center justify-center">
            {hasMultipleCameras && (
                <button 
                    onClick={toggleCamera}
                    className="p-3 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors active:rotate-180 duration-300"
                    title="Switch Camera"
                >
                    <SwitchCamera size={24} />
                </button>
            )}
        </div>
      </div>
    </div>,
    targetDocument.body
  );
};
