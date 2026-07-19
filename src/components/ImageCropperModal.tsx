import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, ZoomIn, ZoomOut, RotateCcw, Check, Move } from 'lucide-react';

interface ImageCropperModalProps {
  onClose: () => void;
  onCropComplete: (base64Image: string) => void;
  title?: string;
}

export default function ImageCropperModal({ onClose, onCropComplete, title = 'Crop Profile Picture' }: ImageCropperModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOffsetStart, setDragOffsetStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOver, setDragOver] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset states when changing image
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNaturalDimensions(null);
  }, [imageSrc]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  const loadImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  // Get bounding coordinates of offset to ensure the image always fills the circular crop area
  const getOffsetBounds = (currentZoom: number) => {
    if (!naturalDimensions) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const { width: nw, height: nh } = naturalDimensions;

    // The smaller dimension is exactly aligned with the 230px crop circle at zoom=1
    const fitScale = 230 / Math.min(nw, nh);
    const renderedWidth = nw * fitScale;
    const renderedHeight = nh * fitScale;

    // Max offset allows moving the edges up to the circle boundaries (115px radius)
    const maxDx = Math.max(0, (renderedWidth * currentZoom) / 2 - 115);
    const maxDy = Math.max(0, (renderedHeight * currentZoom) / 2 - 115);

    return {
      minX: -maxDx,
      maxX: maxDx,
      minY: -maxDy,
      maxY: maxDy,
    };
  };

  const constrainAndSetOffset = (rawX: number, rawY: number, currentZoom: number) => {
    const { minX, maxX, minY, maxY } = getOffsetBounds(currentZoom);
    setOffset({
      x: Math.max(minX, Math.min(maxX, rawX)),
      y: Math.max(minY, Math.min(maxY, rawY)),
    });
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    // Re-constrain offset immediately for the new zoom factor
    const { minX, maxX, minY, maxY } = getOffsetBounds(newZoom);
    setOffset((prev) => ({
      x: Math.max(minX, Math.min(maxX, prev.x)),
      y: Math.max(minY, Math.min(maxY, prev.y)),
    }));
  };

  // Pan image handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffsetStart({ ...offset });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !imageSrc) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const targetX = dragOffsetStart.x + dx;
    const targetY = dragOffsetStart.y + dy;
    constrainAndSetOffset(targetX, targetY, zoom);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!imageSrc || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setDragOffsetStart({ ...offset });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !imageSrc || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    const targetX = dragOffsetStart.x + dx;
    const targetY = dragOffsetStart.y + dy;
    constrainAndSetOffset(targetX, targetY, zoom);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Core cropping execution using HTML5 Canvas
  const handleCrop = () => {
    if (!imageSrc || !naturalDimensions || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    // Save output at a high-quality 256x256 resolution
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Clear canvas with transparency for a perfect circular clip png
      ctx.clearRect(0, 0, size, size);

      // Clip canvas to a circular path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      const img = imgRef.current;
      const { width: nw, height: nh } = naturalDimensions;

      const fitScale = 230 / Math.min(nw, nh);
      const renderedWidth = nw * fitScale;
      const renderedHeight = nh * fitScale;

      // Map scale & translations to canvas space
      // Since the 230px circle is scaled to fill the 256px canvas, outputScale = size / 230
      const outputScale = size / 230;

      ctx.save();
      
      // Translate canvas center to match viewport center
      ctx.translate(size / 2, size / 2);

      // Apply zoom & translation offsets
      ctx.translate(offset.x * outputScale, offset.y * outputScale);
      ctx.scale(zoom, zoom);

      // Draw image centered
      ctx.drawImage(
        img,
        -renderedWidth / 2 * outputScale,
        -renderedHeight / 2 * outputScale,
        renderedWidth * outputScale,
        renderedHeight * outputScale
      );

      ctx.restore();

      const base64Result = canvas.toDataURL('image/png', 1.0);
      onCropComplete(base64Result);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0A0A0C] border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-500 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload State / Cropping Area */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[340px]">
          {!imageSrc ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
                dragOver
                  ? 'border-rose-500/50 bg-rose-500/5'
                  : 'border-zinc-850 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950/80'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-850 text-zinc-400">
                <Upload className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white">Click or drag image here</p>
                <p className="text-[10px] text-zinc-500 mt-1">Supports JPG, PNG or WEBP formats</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 w-full flex flex-col items-center">
              {/* Interactive Cropper Circle Viewport */}
              <div className="relative w-[280px] h-[280px] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-900 select-none">
                
                {/* Image Container with Drag listeners */}
                <div
                  ref={containerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="w-full h-full relative cursor-move overflow-hidden flex items-center justify-center"
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Source"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setNaturalDimensions({
                        width: img.naturalWidth,
                        height: img.naturalHeight
                      });
                      setZoom(1);
                      setOffset({ x: 0, y: 0 });
                    }}
                    draggable={false}
                    style={{
                      pointerEvents: 'none',
                      ...(naturalDimensions ? {
                        width: `${naturalDimensions.width * (230 / Math.min(naturalDimensions.width, naturalDimensions.height))}px`,
                        height: `${naturalDimensions.height * (230 / Math.min(naturalDimensions.width, naturalDimensions.height))}px`,
                        minWidth: `${naturalDimensions.width * (230 / Math.min(naturalDimensions.width, naturalDimensions.height))}px`,
                        minHeight: `${naturalDimensions.height * (230 / Math.min(naturalDimensions.width, naturalDimensions.height))}px`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                      } : {
                        maxWidth: '100%',
                        maxHeight: '100%',
                      }),
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    }}
                    className="object-contain pointer-events-none"
                  />
                </div>

                {/* Circular Mask Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-full h-full relative">
                    {/* Dark layers outside the circle mask */}
                    <svg className="absolute inset-0 w-full h-full">
                      <defs>
                        <mask id="cropMask">
                          <rect width="280" height="280" fill="white" />
                          <circle cx="140" cy="140" r="115" fill="black" />
                        </mask>
                      </defs>
                      <rect width="280" height="280" fill="rgba(0, 0, 0, 0.65)" mask="url(#cropMask)" />
                      {/* Circle border accent */}
                      <circle cx="140" cy="140" r="115" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.5" fill="none" />
                    </svg>

                    {/* Move indicator helper */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/75 rounded-full border border-white/10 flex items-center gap-1.5">
                      <Move className="w-3 h-3 text-zinc-400" />
                      <span className="text-[9px] font-mono font-medium text-zinc-300 uppercase tracking-wider">Drag to position</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="w-full space-y-4">
                {/* Zoom control */}
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-zinc-500" />
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                    className="flex-1 accent-rose-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <ZoomIn className="w-4 h-4 text-zinc-500" />
                  <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                {/* Action controls inside picture mode */}
                <div className="flex justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setImageSrc(null)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Image
                  </button>
                  <button
                    type="button"
                    onClick={handleCrop}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-900/10 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Crop & Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
