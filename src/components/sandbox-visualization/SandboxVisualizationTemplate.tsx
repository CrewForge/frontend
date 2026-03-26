import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';

/** Page background used by Strategy and EvalPlus sandboxes. */
export const SANDBOX_PAGE_GRADIENT =
  'min-h-screen bg-[radial-gradient(circle_at_top,#eef2ff_0%,#ffffff_40%)]';

type SandboxVisualizationRootProps = {
  children: React.ReactNode;
};

export function SandboxVisualizationRoot({ children }: SandboxVisualizationRootProps) {
  return (
    <div className={SANDBOX_PAGE_GRADIENT}>
      <div className="sandbox-shell flex min-h-screen flex-col px-3 py-2 sm:px-4 sm:py-3 lg:px-5">
        <div className="rounded-2xl border bg-card/95 shadow-sm backdrop-blur">{children}</div>
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
  /** Shown next to title (e.g. "Workspace", "EvalPlus"). */
  contextBadge: React.ReactNode;
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
  const statusLabel = hasErr ? 'Error' : playbackActive ? 'Playing' : 'Ready';

  return (
    <div className="border-b px-3 py-2.5 sm:px-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="shrink-0">
          ← Back
        </Button>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
        {contextBadge}
        <Badge variant="outline">{dataSource === 'live' ? 'Live' : 'Replay'}</Badge>
        <Badge variant={hasErr ? 'destructive' : playbackActive ? 'default' : 'secondary'}>{statusLabel}</Badge>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant={dataSource === 'sample' ? 'secondary' : 'outline'}
            size="sm"
            className="h-8"
            onClick={onSwitchToSample}
            disabled={dataSource === 'sample'}
          >
            Replay
          </Button>
          <Button
            type="button"
            variant={dataSource === 'live' ? 'secondary' : 'outline'}
            size="sm"
            className="h-8"
            onClick={onSwitchToLive}
            disabled={dataSource === 'live' || !backendLiveAvailable}
            title={!backendLiveAvailable ? 'Not available without a CrewForge API server' : undefined}
          >
            Live
          </Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      {metricsStrip}
      {hasErr && errorMessage && (
        <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs text-destructive sm:text-sm">
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
  const hasErr = !!errorMessage;
  return (
    <div className="sandbox-viz-toolbar">
      <div className="sandbox-viz-toolbar__badges">
        <Badge variant="outline">{dataSource === 'live' ? 'Live stream' : 'Prepared replay'}</Badge>
        <Badge variant={hasErr ? 'destructive' : playbackActive ? 'default' : 'secondary'}>
          {hasErr ? 'Error' : playbackActive ? 'Playing' : 'Ready'}
        </Badge>
      </div>
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

type SandboxPrimaryCardProps = {
  title: string;
  description: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** Primary visualization card (board / code) — shared chrome. */
export function SandboxPrimaryCard({ title, description, toolbar, children, className }: SandboxPrimaryCardProps) {
  return (
    <Card className={className ?? 'min-w-0 overflow-hidden'}>
      <div className="border-b px-3 py-2 sm:px-4">
        <h3 className="text-sm font-semibold sm:text-base">{title}</h3>
        <div className="text-xs text-muted-foreground [&_p]:mt-0">{description}</div>
      </div>
      <div className="min-w-0 px-3 pb-2.5 pt-2 sm:px-4 sm:pb-3 sm:pt-2.5">
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
    <Card className={className ?? 'sandbox-move-log sandbox-log-panel gap-0 p-3'}>
      <div className="sandbox-move-log__header mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="sandbox-log-title">{title}</h3>
          <p className="sandbox-log-subtitle">{subtitle}</p>
        </div>
        <Badge variant="outline">{entryCount} entries</Badge>
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="sandbox-log-title">{title}</h3>
          <p className="sandbox-log-subtitle">{subtitle}</p>
        </div>
        {headerRight}
      </div>
      {children}
    </Card>
  );
}
