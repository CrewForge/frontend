const SVG_NS = 'http://www.w3.org/2000/svg';

function parseSvgFromDataUrl(dataUrl: string): SVGSVGElement {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) throw new Error('Invalid data URL');
  const payload = dataUrl.slice(comma + 1);
  const header = dataUrl.slice(0, comma);
  const isBase64 = /base64/i.test(header);
  const xml = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
  const el = doc.documentElement;
  if (!(el instanceof SVGSVGElement)) {
    throw new Error('Expected SVG root');
  }
  return el;
}

function getSvgDimensions(svg: SVGSVGElement): { width: number; height: number } {
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const w = parseFloat(String(svg.getAttribute('width') || '').replace(/px$/, '') || '0');
  const h = parseFloat(String(svg.getAttribute('height') || '').replace(/px$/, '') || '0');
  return { width: w || 1, height: h || 1 };
}

/**
 * Places multiple html-to-image SVG data URLs side-by-side in one SVG (lossless DOM snapshot merge).
 */
export function mergeSvgDataUrlsHorizontal(dataUrls: string[], gapPx: number): string {
  if (dataUrls.length === 0) return '';
  if (dataUrls.length === 1) return dataUrls[0];

  const svgs = dataUrls.map((u) => parseSvgFromDataUrl(u));
  const dims = svgs.map(getSvgDimensions);
  const totalW = dims.reduce((s, d, i) => s + d.width + (i > 0 ? gapPx : 0), 0);
  const maxH = Math.max(...dims.map((d) => d.height));

  const out = document.createElementNS(SVG_NS, 'svg');
  out.setAttribute('xmlns', SVG_NS);
  out.setAttribute('width', String(totalW));
  out.setAttribute('height', String(maxH));
  out.setAttribute('viewBox', `0 0 ${totalW} ${maxH}`);

  let x = 0;
  for (let i = 0; i < svgs.length; i++) {
    const src = svgs[i];
    const { width: w, height: h } = dims[i];
    if (i > 0) x += gapPx;

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${x}, ${(maxH - h) / 2})`);
    const children = Array.from(src.childNodes);
    for (const child of children) {
      g.appendChild(child.cloneNode(true));
    }
    out.appendChild(g);
    x += w;
  }

  let serialized = new XMLSerializer().serializeToString(out);
  serialized = serialized.replace(/>\s+</g, '><');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
}
