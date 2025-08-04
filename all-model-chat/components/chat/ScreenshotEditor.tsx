import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Crop } from 'lucide-react';

interface ScreenshotEditorProps {
  screenshotUrl: string | null;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export const ScreenshotEditor: React.FC<ScreenshotEditorProps> = ({ screenshotUrl, onConfirm, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  const [selection, setSelection] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!canvas || !ctx || !img.src) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the screenshot image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Create a semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // If there's a selection, clear the overlay in that area and draw a border
    if (selection) {
      const { x1, y1, x2, y2 } = selection;
      const width = x2 - x1;
      const height = y2 - y1;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'black'; // The color doesn't matter with this composite operation
      ctx.fillRect(x1, y1, width, height);
      ctx.restore();

      ctx.strokeStyle = '#0ea5e9'; // A nice blue color
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, width, height);
    }
  }, [selection]);

  useEffect(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;

    const loadImage = () => {
      if (!screenshotUrl) return;
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        if (canvas) {
            // Set canvas size to match viewport while maintaining aspect ratio
            const { clientWidth, clientHeight } = document.documentElement;
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            let canvasWidth = clientWidth * 0.9;
            let canvasHeight = canvasWidth / aspectRatio;

            if (canvasHeight > clientHeight * 0.8) {
                canvasHeight = clientHeight * 0.8;
                canvasWidth = canvasHeight * aspectRatio;
            }
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            draw();
        }
      };
      img.src = screenshotUrl;
    };

    loadImage();
    
    const handleResize = () => loadImage();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  }, [screenshotUrl, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    const { x, y } = getCanvasCoordinates(e);
    setSelection({ x1: x, y1: y, x2: x, y2: y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSelecting || !selection) return;
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);
    setSelection({ ...selection, x2: x, y2: y });
  };
  
  const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsSelecting(false);
  };
  
  const handleConfirm = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img.src) return;

    let cropRect = {
      x: 0,
      y: 0,
      width: imageDimensions.width,
      height: imageDimensions.height,
    };

    if (selection) {
      // Normalize selection rectangle (in case user dragged up/left)
      const x1 = Math.min(selection.x1, selection.x2);
      const y1 = Math.min(selection.y1, selection.y2);
      const x2 = Math.max(selection.x1, selection.x2);
      const y2 = Math.max(selection.y1, selection.y2);
      
      const width = x2 - x1;
      const height = y2 - y1;

      // Ensure selection has a size
      if (width < 5 || height < 5) {
        // if selection is too small, use full image
      } else {
        // Map canvas selection coordinates to original image coordinates
        const scaleX = imageDimensions.width / canvas.width;
        const scaleY = imageDimensions.height / canvas.height;
        cropRect = {
          x: x1 * scaleX,
          y: y1 * scaleY,
          width: width * scaleX,
          height: height * scaleY,
        };
      }
    }
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropRect.width;
    tempCanvas.height = cropRect.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
      console.error("Could not create temporary canvas context for cropping.");
      onCancel();
      return;
    }
    
    tempCtx.drawImage(
      img,
      cropRect.x, cropRect.y, cropRect.width, cropRect.height, // source rect
      0, 0, tempCanvas.width, tempCanvas.height // destination rect
    );

    tempCanvas.toBlob((blob) => {
      if (blob) {
        const fileName = `screenshot-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        onConfirm(file);
      } else {
        onCancel();
      }
    }, 'image/png');
  };

  if (!screenshotUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="screenshot-editor-title"
    >
      <div className="flex justify-center items-center w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <canvas 
          ref={canvasRef} 
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          className="max-w-full max-h-full rounded-lg shadow-2xl cursor-crosshair"
        />
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-2">
         <h2 id="screenshot-editor-title" className="text-white font-semibold text-lg drop-shadow-lg flex items-center gap-2">
            <Crop size={20} /> Drag to select a region
         </h2>
      </div>
      <div className="absolute bottom-6 flex items-center gap-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-full shadow-lg flex items-center gap-2 transition-colors"
        >
          <X size={20} /> Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
        >
          <Check size={24} /> Confirm
        </button>
      </div>
    </div>
  );
};
