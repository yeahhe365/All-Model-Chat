import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => Promise<void>;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    let active = true;
    let mediaStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if(active) {
            setStream(mediaStream);
            if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            }
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        if(active) setError("Could not access the camera. Please check permissions and ensure your device has a camera.");
      }
    };
    startCamera();

    return () => {
      active = false;
      mediaStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleCapture = useCallback(async () => {
    if (isCapturing || !videoRef.current || !canvasRef.current || !stream) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      
      if (blob) {
        const fileName = `photo-${new Date().toISOString().slice(0, 19)}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        await onCapture(file);
      } else {
        console.error("Failed to create blob from canvas.");
        setIsCapturing(false);
      }
    } else {
        setIsCapturing(false);
    }
  }, [onCapture, stream, isCapturing]);

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-2 sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="camera-capture-title"
    >
      <div className="relative w-full max-w-2xl bg-black rounded-lg shadow-2xl flex flex-col">
        <div className="p-2 flex justify-between items-center text-white bg-black/30">
          <h2 id="camera-capture-title" className="text-lg font-semibold">Take a Photo</h2>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-white/10" aria-label="Close camera">
            <X size={24} />
          </button>
        </div>
        <div className="aspect-video w-full">
            {error ? (
            <div className="w-full h-full flex items-center justify-center text-red-400 bg-gray-900 p-4 text-center">{error}</div>
            ) : (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain"></video>
            )}
            <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
        <div className="flex items-center justify-center p-4 bg-black/30">
            <button 
                onClick={handleCapture} 
                disabled={!stream || !!error || isCapturing} 
                className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center ring-4 ring-white/30 hover:ring-white/50 transition disabled:bg-gray-400 disabled:ring-gray-500"
                aria-label="Take picture"
            >
            {isCapturing ? (
              <Loader2 size={32} className="animate-spin text-gray-800" />
            ) : (
              <Camera size={32} className="text-gray-800" />
            )}
            </button>
        </div>
      </div>
    </div>
  );
};