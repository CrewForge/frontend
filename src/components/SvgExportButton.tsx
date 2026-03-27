import { useCallback, useState } from 'react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { ImageDown, Loader2 } from 'lucide-react';

/** Class used by html-to-image filter so the export control is not part of the snapshot. */
export const SVG_EXPORT_BTN_CLASS = 'svg-export-btn';

export type SvgExportButtonProps = {
  /** When true, the button is rendered even in production builds. */
  forceShow?: boolean;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function waitForImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode PNG data URL'));
    img.src = dataUrl;
  });
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas toBlob failed'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

async function captureViewportAtRatio(
  pixelRatio: number,
): Promise<{ blob: Blob; width: number; height: number; bytes: number }> {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dataUrl = await toPng(document.body, {
    width: w,
    height: h,
    pixelRatio,
    cacheBust: true,
    style: {
      transform: `translate(${-window.scrollX}px, ${-window.scrollY}px)`,
      transformOrigin: 'top left',
    },
    filter: (node) => {
      if (!(node instanceof Element)) return true;
      return !node.classList.contains(SVG_EXPORT_BTN_CLASS);
    },
    onImageErrorHandler: (event) => {
      console.warn('[png-export] image/font resource failed during capture', event);
    },
  });

  const img = await waitForImage(dataUrl);
  const blob = await dataUrlToBlob(dataUrl);
  return {
    blob,
    width: img.naturalWidth,
    height: img.naturalHeight,
    bytes: blob.size,
  };
}

async function captureBestUnderLimit(
  maxBytes: number,
): Promise<{ blob: Blob; width: number; height: number; bytes: number }> {
  const baseRatio = Math.max(1, window.devicePixelRatio || 1);
  const maxRatio = 8;

  let best = await captureViewportAtRatio(baseRatio);
  if (best.bytes > maxBytes) {
    // If even base is too large, search downward.
    let lo = 0.35;
    let hi = baseRatio;
    let lowBest = await captureViewportAtRatio(lo);
    if (lowBest.bytes > maxBytes) {
      return lowBest;
    }
    for (let i = 0; i < 6; i++) {
      const mid = (lo + hi) / 2;
      const attempt = await captureViewportAtRatio(mid);
      if (attempt.bytes <= maxBytes) {
        lowBest = attempt;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return lowBest;
  }

  // Upscale until we cross the cap (or hit max), then binary search back down.
  let lo = baseRatio;
  let hi = baseRatio;
  while (hi < maxRatio) {
    const next = Math.min(maxRatio, hi * 1.5);
    const attempt = await captureViewportAtRatio(next);
    if (attempt.bytes <= maxBytes) {
      best = attempt;
      lo = next;
      hi = next;
    } else {
      hi = next;
      break;
    }
  }

  // If we never exceeded the limit, best is already max reachable.
  if (best.bytes <= maxBytes && hi === lo) {
    return best;
  }

  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2;
    const attempt = await captureViewportAtRatio(mid);
    if (attempt.bytes <= maxBytes) {
      best = attempt;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}

export function SvgExportButton({ forceShow = false }: SvgExportButtonProps) {
  const [busy, setBusy] = useState(false);

  const enabled =
    forceShow ||
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_SVG_EXPORT === 'true';

  const handleExport = useCallback(async () => {
    if (busy) return;

    const root = document.getElementById('root');
    if (!root || root.childElementCount === 0) {
      console.warn('[png-export] #root has no content');
      toast.error('Nothing to capture yet.');
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w < 2 || h < 2) {
      toast.error('Cannot export: viewport is too small.');
      return;
    }

    setBusy(true);
    try {
      const limitBytes = 3 * 1024 * 1024 - 8 * 1024;
      const fitted = await captureBestUnderLimit(limitBytes);
      const filename = `ui-snapshot-${Date.now()}.png`;
      downloadBlob(fitted.blob, filename);
      toast.success(`PNG exported (${fitted.width}x${fitted.height}, ${(fitted.bytes / (1024 * 1024)).toFixed(2)} MB).`);
    } catch (err) {
      console.error('[png-export] failed', err);
      toast.error('PNG export failed. Check the console for details.');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  if (!enabled) {
    return null;
  }

  return (
    <button
      type="button"
      className={`${SVG_EXPORT_BTN_CLASS} svg-export-btn`}
      onClick={handleExport}
      disabled={busy}
      aria-busy={busy}
      aria-label="Export full viewport as PNG under 3MB"
      title="Export full visible screen to PNG (max resolution under 3MB)"
    >
      {busy ? (
        <Loader2 className="svg-export-btn__icon svg-export-btn__icon--spin" aria-hidden />
      ) : (
        <ImageDown className="svg-export-btn__icon" aria-hidden />
      )}
      <span className="svg-export-btn__label">{busy ? 'Exporting…' : 'PNG'}</span>
    </button>
  );
}
