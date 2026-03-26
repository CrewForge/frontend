/**
 * Scrolls only `container` so `child` is visible — avoids chaining scroll on page ancestors
 * (unlike scrollIntoView on nested elements).
 */
export function scrollChildIntoContainer(
  container: HTMLElement | null,
  child: HTMLElement | null,
  options?: { behavior?: ScrollBehavior; padding?: number },
) {
  if (!container || !child) return;
  const pad = options?.padding ?? 8;
  const behavior = options?.behavior ?? "smooth";
  const cr = container.getBoundingClientRect();
  const er = child.getBoundingClientRect();
  const childTop = er.top - cr.top + container.scrollTop;
  const childBottom = childTop + er.height;
  const viewTop = container.scrollTop;
  const viewBottom = container.scrollTop + container.clientHeight;
  if (childTop < viewTop + pad) {
    container.scrollTo({ top: Math.max(0, childTop - pad), behavior });
  } else if (childBottom > viewBottom - pad) {
    container.scrollTo({ top: childBottom - container.clientHeight + pad, behavior });
  }
}
