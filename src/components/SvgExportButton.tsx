import { useCallback, useState } from 'react';
import { getFontEmbedCSS, toSvg } from 'html-to-image';
import { toast } from 'sonner';
import { ImageDown, Loader2 } from 'lucide-react';

/** Class used by html-to-image filter so the export control is not part of the snapshot. */
export const SVG_EXPORT_BTN_CLASS = 'svg-export-btn';

export type SvgExportButtonProps = {
  /** When true, the button is rendered even in production builds. */
  forceShow?: boolean;
};

function downloadSvgDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
}

export function SvgExportButton({ forceShow = false }: SvgExportButtonProps) {
  const [busy, setBusy] = useState(false);

  const enabled =
    forceShow ||
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_SVG_EXPORT === 'true';

  const handleExport = useCallback(async () => {
    if (busy) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w < 2 || h < 2) {
      console.warn('[svg-export] viewport too small to capture', { w, h });
      toast.error('Cannot export: viewport is too small.');
      return;
    }

    const root = document.getElementById('root');
    if (!root || root.childElementCount === 0) {
      console.warn('[svg-export] #root has no content');
      toast.error('Nothing to capture yet.');
      return;
    }

    setBusy(true);
    try {
      const bg = window.getComputedStyle(document.body).backgroundColor || '#ffffff';

      let fontEmbedCSS: string | undefined;
      try {
        fontEmbedCSS = await getFontEmbedCSS(document.body);
      } catch (fontErr) {
        console.warn('[svg-export] could not embed font CSS (cross-origin fonts may look wrong)', fontErr);
      }

      const dataUrl = await toSvg(document.body, {
        width: w,
        height: h,
        backgroundColor: bg,
        ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
        cacheBust: true,
        pixelRatio: 1,
        filter: (node) => {
          if (!(node instanceof Element)) return true;
          return !node.classList.contains(SVG_EXPORT_BTN_CLASS);
        },
        style: {
          transform: `translate(${-window.scrollX}px, ${-window.scrollY}px)`,
        },
        onImageErrorHandler: (event) => {
          console.warn('[svg-export] embedded image failed (often CORS or blocked URL)', event);
        },
      });

      if (!dataUrl || dataUrl.length < 64) {
        console.warn('[svg-export] empty or invalid SVG output');
        toast.error('No content could be captured.');
        return;
      }

      const filename = `ui-snapshot-${Date.now()}.svg`;
      downloadSvgDataUrl(dataUrl, filename);
      toast.success('SVG snapshot downloaded.');
    } catch (err) {
      console.error('[svg-export] failed', err);
      toast.error('SVG export failed. Check the console for details.');
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
      aria-label="Export viewport as SVG"
      title="Export current viewport as SVG (dev tool)"
    >
      {busy ? (
        <Loader2 className="svg-export-btn__icon svg-export-btn__icon--spin" aria-hidden />
      ) : (
        <ImageDown className="svg-export-btn__icon" aria-hidden />
      )}
      <span className="svg-export-btn__label">{busy ? 'Exporting…' : 'SVG'}</span>
    </button>
  );
}
