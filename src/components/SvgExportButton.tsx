import { useCallback, useState } from 'react';
import { toSvg } from 'html-to-image';
import { toast } from 'sonner';
import { ImageDown, Loader2 } from 'lucide-react';
import { mergeSvgDataUrlsHorizontal } from '../lib/mergeSvgDataUrls';
import { SVG_EXPORT_STYLE_PROPERTIES } from '../lib/svgExportStyleProperties';

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

function pickExportBackground(el: HTMLElement): string {
  const bg = window.getComputedStyle(el).backgroundColor;
  if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
    return bg;
  }
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)') {
    return bodyBg;
  }
  return '#ffffff';
}

function regionPixelSize(el: HTMLElement): { width: number; height: number } {
  const w = Math.ceil(Math.max(el.scrollWidth, el.offsetWidth, el.clientWidth));
  const h = Math.ceil(Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight));
  return { width: Math.max(1, w), height: Math.max(1, h) };
}

/** Browser extensions often inject nodes into the page; excluding them cuts noise and file size. */
function isExtensionInjected(node: Element): boolean {
  const tag = node.tagName?.toLowerCase() ?? '';
  if (tag.includes('protonpass')) return true;
  if (tag.includes('grammarly')) return true;
  if (tag.includes('lastpass')) return true;
  if (node.hasAttribute('data-protonpass-role')) return true;
  const cls = typeof node.className === 'string' ? node.className : '';
  if (cls.includes('grammarly')) return true;
  return false;
}

export function SvgExportButton({ forceShow = false }: SvgExportButtonProps) {
  const [busy, setBusy] = useState(false);

  const enabled =
    forceShow ||
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_SVG_EXPORT === 'true';

  const handleExport = useCallback(async () => {
    if (busy) return;

    const chessEl = document.querySelector<HTMLElement>('[data-sandbox-svg-capture="chess-viz"]');
    const graphEl = document.querySelector<HTMLElement>('[data-sandbox-svg-capture="interaction-graph"]');

    if (!chessEl && !graphEl) {
      console.warn('[svg-export] no chess/diagram regions in DOM (open Strategy workspace)');
      toast.error('Open the Strategy workspace to export the board and interaction diagram.');
      return;
    }

    setBusy(true);
    try {
      const captureRegion = async (el: HTMLElement) => {
        const { width, height } = regionPixelSize(el);
        return toSvg(el, {
          width,
          height,
          backgroundColor: pickExportBackground(el),
          includeStyleProperties: SVG_EXPORT_STYLE_PROPERTIES,
          skipFonts: true,
          cacheBust: true,
          pixelRatio: 1,
          filter: (node) => {
            if (!(node instanceof Element)) return true;
            if (node.classList.contains(SVG_EXPORT_BTN_CLASS)) return false;
            if (isExtensionInjected(node)) return false;
            return true;
          },
          onImageErrorHandler: (event) => {
            console.warn('[svg-export] embedded image failed (often CORS or blocked URL)', event);
          },
        });
      };

      const parts: string[] = [];
      if (chessEl) parts.push(await captureRegion(chessEl));
      if (graphEl) parts.push(await captureRegion(graphEl));

      const merged = mergeSvgDataUrlsHorizontal(parts, 28);

      if (!merged || merged.length < 64) {
        console.warn('[svg-export] empty or invalid SVG output');
        toast.error('Nothing could be exported.');
        return;
      }

      const filename = `chess-snapshot-${Date.now()}.svg`;
      downloadSvgDataUrl(merged, filename);
      toast.success('Chess + diagram exported as SVG.');
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
      aria-label="Export chess board and interaction diagram as SVG"
      title="Export chess + Crew Interactions diagram only (no chrome)"
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
