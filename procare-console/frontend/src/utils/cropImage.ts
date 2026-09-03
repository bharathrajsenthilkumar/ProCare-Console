import { Area } from 'react-easy-crop';

/**
 * Helper function to create an HTMLImageElement asynchronously with CORS credentials.
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * Safely prepares an image source (File or URL string) into an object URL,
 * fetching remote URLs as blobs to ensure clean Canvas access without CORS taint.
 */
export async function prepareImageSource(
  source: File | string
): Promise<{ url: string; cleanup: () => void; fileName: string; mimeType: string }> {
  if (source instanceof File) {
    const url = URL.createObjectURL(source);
    return {
      url,
      cleanup: () => URL.revokeObjectURL(url),
      fileName: source.name,
      mimeType: source.type || 'image/jpeg',
    };
  }

  // For data: and blob: URLs
  if (source.startsWith('data:') || source.startsWith('blob:')) {
    return {
      url: source,
      cleanup: () => {},
      fileName: 'image.jpg',
      mimeType: 'image/jpeg',
    };
  }

  // Derive filename from URL
  let fileName = 'recropped-image.jpg';
  try {
    const urlObj = new URL(source);
    const pathname = urlObj.pathname;
    const extracted = pathname.substring(pathname.lastIndexOf('/') + 1);
    if (extracted) {
      fileName = extracted;
    }
  } catch {
    // Keep fallback
  }

  // For remote URLs (e.g. Supabase Storage), fetch as blob to ensure CORS canvas extraction
  try {
    const res = await fetch(source, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      return {
        url,
        cleanup: () => URL.revokeObjectURL(url),
        fileName,
        mimeType: blob.type || 'image/jpeg',
      };
    }
  } catch (err) {
    console.warn('Remote blob fetch failed; falling back to direct URL with crossOrigin anonymous:', err);
  }

  return {
    url: source,
    cleanup: () => {},
    fileName,
    mimeType: 'image/jpeg',
  };
}

/**
 * Extracts the cropped area from an image using HTML5 Canvas and returns a File object.
 *
 * @param imageSrc - Object URL or data URL of the image
 * @param pixelCrop - Coordinates and dimensions of the cropped area
 * @param originalFileName - Original file name to derive the cropped file name
 * @param mimeType - Desired MIME type (defaults to 'image/jpeg')
 * @returns Promise resolving to a standard File object
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  originalFileName: string = 'cropped-image.jpg',
  mimeType: string = 'image/jpeg'
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D rendering context is not available');
  }

  // Set canvas size to the cropped area dimensions
  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));

  // Draw the cropped area onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Convert canvas to Blob then wrap as standard File
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas conversion to Blob failed'));
          return;
        }

        const baseName = originalFileName.replace(/\.[^/.]+$/, '').replace(/^[\\/]/, '');
        const extension = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
        const finalName = `${baseName || 'recropped'}${extension}`;

        const file = new File([blob], finalName, {
          type: mimeType,
          lastModified: Date.now(),
        });

        resolve(file);
      },
      mimeType,
      0.95
    );
  });
}
