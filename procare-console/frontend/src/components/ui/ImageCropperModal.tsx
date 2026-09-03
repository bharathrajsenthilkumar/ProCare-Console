'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Check, Crop, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getCroppedImg, prepareImageSource } from '@/utils/cropImage';

export interface ImageCropperModalProps {
  imageFile?: File | string | null;
  imageSource?: File | string | null;
  aspectRatio: number;
  onCropComplete: (croppedFile: File) => void;
  onClose: () => void;
  title?: string;
  cropShape?: 'rect' | 'round';
}

export function ImageCropperModal({
  imageFile,
  imageSource,
  aspectRatio,
  onCropComplete,
  onClose,
  title = 'Crop & Position Image',
  cropShape = 'rect',
}: ImageCropperModalProps) {
  const activeSource = imageSource || imageFile;
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('image.jpg');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [loadingSource, setLoadingSource] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const cleanupRef = useRef<(() => void) | null>(null);

  // Prepare image source and clean up on change/unmount
  useEffect(() => {
    if (!activeSource) {
      setImageSrc(null);
      setLoadingSource(false);
      return;
    }

    let isMounted = true;
    setLoadingSource(true);
    setLoadError(null);

    prepareImageSource(activeSource)
      .then(({ url, cleanup, fileName: fName, mimeType: mType }) => {
        if (!isMounted) {
          cleanup();
          return;
        }
        if (cleanupRef.current) {
          cleanupRef.current();
        }
        cleanupRef.current = cleanup;
        setImageSrc(url);
        setFileName(fName);
        setMimeType(mType);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setLoadingSource(false);
      })
      .catch((err) => {
        console.error('Failed to prepare image source:', err);
        if (isMounted) {
          setLoadError('Failed to load image for cropping.');
          setLoadingSource(false);
        }
      });

    return () => {
      isMounted = false;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [activeSource]);

  const onCropChange = (newCrop: Point) => {
    setCrop(newCrop);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropAreaComplete = useCallback((_croppedArea: Area, pixelCrop: Area) => {
    setCroppedAreaPixels(pixelCrop);
  }, []);

  const handleApplyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setIsProcessing(true);
      const croppedFile = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        fileName,
        mimeType
      );
      onCropComplete(croppedFile);
    } catch (err: any) {
      console.error('Failed to crop image:', err);
      setLoadError(`Crop operation failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!activeSource) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <Crop className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {aspectRatio === 1 ? '1:1 Square Mask for Staff Avatars' : '16:9 Landscape Mask for Gallery Slides'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cropper modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cropper Viewport Container */}
        <div className="relative h-72 w-full bg-slate-950 flex items-center justify-center">
          {loadingSource ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-sky-500" />
              <span className="text-xs">Loading image...</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-2 p-4 text-center text-rose-400">
              <AlertCircle className="h-6 w-6" />
              <span className="text-xs font-semibold">{loadError}</span>
            </div>
          ) : imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              cropShape={cropShape}
              showGrid={true}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropAreaComplete}
            />
          ) : null}
        </div>

        {/* Zoom Controls */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/30 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/20">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="h-3.5 w-3.5 text-slate-400" /> Zoom Level
            </span>
            <span className="font-mono text-[11px] text-slate-500">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => setZoom((prev) => Math.max(1, prev - 0.2))}
              disabled={loadingSource || !!loadError}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.05}
              aria-label="Zoom slider"
              disabled={loadingSource || !!loadError}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-600 dark:bg-slate-700 disabled:opacity-40"
            />
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => setZoom((prev) => Math.min(3, prev + 0.2))}
              disabled={loadingSource || !!loadError}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApplyCrop}
            disabled={isProcessing || loadingSource || !!loadError}
            className="flex items-center gap-1.5"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Apply Crop
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
