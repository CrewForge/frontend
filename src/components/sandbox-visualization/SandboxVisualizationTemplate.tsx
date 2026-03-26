import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { cn } from '../ui/utils';

/** Page background used by Strategy and EvalPlus sandboxes. */
export const SANDBOX_PAGE_GRADIENT =
  'min-h-screen bg-[radial-gradient(ellipse_120%_80%_at_50%_-25%,#e0e7ff_0%,#f1f5f9_38%,#f8fafc_100%)]';

type SandboxVisualizationRootProps = {
  children: React.ReactNode;
};

export function SandboxVisualizationRoot({ children }: SandboxVisualizationRootProps) {
  return (
    <div className={SANDBOX_PAGE_GRADIENT}>
      <div className="sandbox-shell flex min-h-screen flex-col px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
        <div className="sandbox-chrome-card rounded-2xl border border-border/70 shadow-sm backdrop-blur-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

export type SandboxMetricStripItem = {
  key: string;
  label: string;
  value: React.ReactNode;
  /** Extra muted text after value (e.g. chess inferred note). */
  mutedSuffix?: React.ReactNode;
};

export function SandboxMetricsStrip({ items }: { items: SandboxMetricStripItem[] }) {
  return (
    <div className="sandbox-metrics-strip mt-2.5">
      {items.map((it, i) => (
        <React.Fragment key={it.key}>
          {i > 0 && (
            <span className="sandbox-metrics-strip__sep" aria-hidden>
              ·
            </span>
          )}
          <span>
            <span className="sandbox-metrics-strip__k">{it.label}</span> {it.value}
            {it.mutedSuffix}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

export type SandboxEnvironmentHeaderProps = {
  onBack: () => void;
  title: string;
  /** Optional label beside the title (omit when the title is already specific). */
  contextBadge?: React.ReactNode;
  dataSource: 'live' | 'sample';
  playbackActive: boolean;
  errorMessage?: string | null;
  backendLiveAvailable: boolean;
  onSwitchToSample: () => void;
  onSwitchToLive: () => void;
  subtitle: string;
  metricsStrip: React.ReactNode;
};

export function SandboxEnvironmentHeader({
  onBack,
  title,
  contextBadge,
  dataSource,
  playbackActive,
  errorMessage,
  backendLiveAvailable,
  onSwitchToSample,
  onSwitchToLive,
  subtitle,
  metricsStrip,
}: SandboxEnvironmentHeaderProps) {
  const hasErr = !!errorMessage;

  return (
    <div className="sandbox-env-header border-b border-border/60 px-8 py-4 sm:px-10 sm:py-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4 ml-2">
          <Button variant="outline" size="sm" onClick={onBack} className="shrink-0 px-3 py-1.5">
            ← Back
          </Button>
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h1>
          {contextBadge}
        </div>
        <div className="shrink-0 mr-2">{metricsStrip}</div>
      </div>
      {hasErr && errorMessage && (
        <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2 text-xs text-destructive sm:text-sm">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

type SandboxVizToolbarBlockProps = {
  dataSource: 'live' | 'sample';
  playbackActive: boolean;
  errorMessage?: string | null;
  playbackControls: React.ReactNode;
  onFullReset: () => void;
  fullResetLabel?: string;
};

/** Inner toolbar under the primary card title — matches Strategy sandbox (badges + playback + reset). */
export function SandboxVizToolbarBlock({
  dataSource,
  playbackActive,
  errorMessage,
  playbackControls,
  onFullReset,
  fullResetLabel = 'Full reset',
}: SandboxVizToolbarBlockProps) {
  return (
    <div className="sandbox-viz-toolbar">
      <div className="sandbox-viz-toolbar__playback-row">
        <div className="sandbox-viz-toolbar__playback-wrap">{playbackControls}</div>
        <div className="sandbox-viz-toolbar__actions">
          <Button variant="outline" size="sm" onClick={onFullReset}>
            {fullResetLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Top of the right column: expand/shrink workspace split (~80% side vs default). */
export function SandboxSidePanelHeader({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="sandbox-side-panel-header">
      <span className="text-xs font-semibold tracking-tight text-foreground/90">Interaction & logs</span>
      <motion.div
        initial={false}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? 'Shrink side panel to default width' : 'Expand side panel to about eighty percent width'}
        >
          {expanded ? (
            <>
              <Minimize2 className="size-3.5 shrink-0" aria-hidden />
              Shrink
            </>
          ) : (
            <>
              <Maximize2 className="size-3.5 shrink-0" aria-hidden />
              Expand
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}

type SandboxPrimaryCardProps = {
  title: string;
  description: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** Primary visualization card (board / code) — shared chrome. */
export function SandboxPrimaryCard({ title, description, toolbar, children, className }: SandboxPrimaryCardProps) {
  const hasDescription = description != null && description !== '' && description !== false;
  return (
    <Card className={className ?? 'sandbox-primary-card min-w-0 overflow-hidden'}>
      <div className="border-b border-border/60 bg-muted/25 px-4 py-2.5 sm:px-5">
        <h3 className="text-sm font-semibold sm:text-base">{title}</h3>
        {hasDescription && <div className="mt-0.5 text-xs text-muted-foreground [&_p]:mt-0">{description}</div>}
      </div>
      <div className="min-w-0 bg-card/80 px-4 pb-3 pt-2.5 sm:px-5 sm:pb-4 sm:pt-3">
        {toolbar}
        {children}
      </div>
    </Card>
  );
}

type SandboxSideLogCardProps = {
  title: string;
  subtitle: string;
  entryCount: number;
  children: React.ReactNode;
  className?: string;
};

/** Right-column log panel with Strategy-style header and scroll region. */
export function SandboxSideLogCard({ title, subtitle, entryCount, children, className }: SandboxSideLogCardProps) {
  return (
    <Card className={className ?? 'sandbox-move-log sandbox-log-panel gap-0'}>
      <div className="sandbox-move-log__header mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="sandbox-log-title">{title}</h3>
          <p className="sandbox-log-subtitle mt-0.5">{subtitle}</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
          {entryCount} entries
        </Badge>
      </div>
      {children}
    </Card>
  );
}

type SandboxSecondaryPanelProps = {
  title: string;
  subtitle: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** Right-column card with log-style title row and custom trailing control (e.g. Pass@k). */
export function SandboxSecondaryPanel({
  title,
  subtitle,
  headerRight,
  children,
  className = 'sandbox-log-panel p-3',
}: SandboxSecondaryPanelProps) {
  return (
    <Card className={className}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div>
          <h3 className="sandbox-log-title">{title}</h3>
          <p className="sandbox-log-subtitle mt-0.5">{subtitle}</p>
        </div>
        {headerRight}
      </div>
      {children}
    </Card>
  );
}
