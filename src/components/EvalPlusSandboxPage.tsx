import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { SandboxPlaybackControls } from './SandboxPlaybackControls';
import { motion } from 'motion/react';
import { ApiError, authHeaders, streamEvalPlusAutoUrl, throwIfResponseNotOk } from '../lib/api';
import type { ChessSandboxPageProps } from './ChessSandboxPage';
import {
  type EvalPlusRunnerMove,
  type EvalPlusPassAtK,
  type EvalPlusRunResult,
  movesFromPayload,
  extractPassAtK,
  completedTaskOrdinal,
} from '../lib/evalplusExperiment';
import { EvalPlusCodeDiff } from './EvalPlusCodeDiff';
import { IdeHighlightedCode } from './IdeHighlightedCode';
import { CopyCodeButton } from './CopyCodeButton';
import { Switch } from './ui/switch';
import { EvalPlusResultsDialog, type EvalPlusResultsSummary } from './EvalPlusResultsDialog';
import { detectLanguage } from '../lib/syntaxHighlight';

type StreamPayload = {
  type?: string;
  message?: string;
  turn?: number;
  player?: string;
  action?: string;
  env_state?: EvalPlusRunnerMove['env_state'];
  system_move_record?: EvalPlusRunnerMove['system_move_record'];
  timestamp?: string;
  latency_ms?: number;
  task_label?: string;
  result?: { pass_at_k?: EvalPlusPassAtK };
};

function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return m > 0 ? `${m}:${rs.toString().padStart(2, '0')}` : `${rs}s`;
}

function isEvalPlusEvent(p: StreamPayload): p is StreamPayload & EvalPlusRunnerMove {
  return (
    p.type === 'event' &&
    typeof p.turn === 'number' &&
    typeof p.action === 'string' &&
    typeof p.player === 'string' &&
    p.env_state !== undefined &&
    typeof p.env_state.num_tasks === 'number'
  );
}

export function EvalPlusSandboxPage({
  token,
  onBack,
  dataSource = 'sample',
  onSetDataSource,
  onAuthFailure,
  backendLiveAvailable = true,
}: ChessSandboxPageProps) {
  const environmentLabel = 'EvalPlus workspace';

  const [isPlaying, setIsPlaying] = useState(false);
  const [moves, setMoves] = useState<EvalPlusRunnerMove[]>([]);
  const movesRef = useRef<EvalPlusRunnerMove[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [passAtK, setPassAtK] = useState<EvalPlusPassAtK | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [evalResults, setEvalResults] = useState<EvalPlusResultsSummary | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Awaiting start');
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamStartedAtRef = useRef<number | null>(null);
  const sawEndEventRef = useRef(false);
  const [showBackendLog, setShowBackendLog] = useState(false);
  const [systemLog, setSystemLog] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(true);
  const [samplePlaybackPlaying, setSamplePlaybackPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const appendSystemLog = useCallback((entry: string) => {
    setSystemLog((prev) => [entry, ...prev].slice(0, 60));
  }, []);

  const resetState = useCallback(() => {
    setMoves([]);
    movesRef.current = [];
    setStepIndex(0);
    setPassAtK(null);
    setAutoError(null);
    setStatusMessage('Awaiting start');
    setSystemLog([]);
    streamStartedAtRef.current = null;
    sawEndEventRef.current = false;
    setEvalResults(null);
    setSamplePlaybackPlaying(false);
  }, []);

  /** Stable summary builder from refs only — safe to call from loadEvalSample without depending on passAtK state. */
  const buildResultsSummaryFromRefs = useCallback((passAtKValue: EvalPlusPassAtK | null): EvalPlusResultsSummary => {
    const durationMs = streamStartedAtRef.current ? Date.now() - streamStartedAtRef.current : 0;
    const list = movesRef.current;
    const latencies = list.map((m) => m.latency_ms).filter((x): x is number => typeof x === 'number');
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
    let tokens = 0;
    for (const m of list) {
      const t = m.system_move_record?.total_tokens;
      if (typeof t === 'number') tokens += t;
    }
    return {
      submissions: list.length,
      durationLabel: formatDuration(durationMs),
      averageLatencyMs: avgLatency,
      totalTokens: tokens > 0 ? tokens : null,
      passAtK: passAtKValue,
      summaryLine:
        'Metrics are derived from streamed RunnerMoveRecord payloads (CrewForge runner). Pass@k comes from the final end event or bundled experiment JSON.',
    };
  }, []);

  const buildResultsSummary = useCallback((passAtKOverride?: EvalPlusPassAtK | null): EvalPlusResultsSummary => {
    const pk = passAtKOverride !== undefined ? passAtKOverride : passAtK;
    return buildResultsSummaryFromRefs(pk);
  }, [passAtK, buildResultsSummaryFromRefs]);

  const processPayload = useCallback(
    (payload: StreamPayload, options?: { suppressDialogs?: boolean }) => {
      if (!payload || typeof payload !== 'object') return false;

      if (payload.type === 'log') {
        appendSystemLog(payload.message || 'Log');
        return false;
      }

      if (isEvalPlusEvent(payload)) {
        const move: EvalPlusRunnerMove = {
          turn: payload.turn,
          player: payload.player,
          action: payload.action,
          env_state: payload.env_state!,
          system_move_record: payload.system_move_record,
          timestamp: payload.timestamp,
          latency_ms: payload.latency_ms,
          task_label: payload.task_label,
        };
        setMoves((prev) => {
          const next = [...prev, move];
          movesRef.current = next;
          setStepIndex(next.length - 1);
          return next;
        });
        setStatusMessage(`Recorded turn ${payload.turn + 1} (${payload.task_label ?? 'task'})`);
        return false;
      }

      if (payload.type === 'end') {
        sawEndEventRef.current = true;
        const pk = payload.result?.pass_at_k;
        if (pk && typeof pk === 'object') setPassAtK(pk);
        setStatusMessage('Run complete');
        if (!options?.suppressDialogs) {
          setEvalResults(buildResultsSummary(pk && typeof pk === 'object' ? pk : null));
          setResultsOpen(true);
        }
        return true;
      }

      appendSystemLog(JSON.stringify(payload));
      return false;
    },
    [appendSystemLog, buildResultsSummary],
  );

  const processLine = useCallback(
    (line: string) => {
      try {
        const payload = JSON.parse(line) as StreamPayload;
        return processPayload(payload);
      } catch {
        appendSystemLog(line);
        return false;
      }
    },
    [appendSystemLog, processPayload],
  );

  const startLiveStream = useCallback(async () => {
    if (!backendLiveAvailable) {
      setAutoError('Live stream is not available in this build. Use Replay.');
      return;
    }
    if (!token) {
      setAutoError('Missing authentication token.');
      return;
    }
    abortControllerRef.current?.abort();
    resetState();
    setResultsOpen(false);
    setIsPlaying(true);
    setStatusMessage('Connecting to EvalPlus stream…');
    sawEndEventRef.current = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(streamEvalPlusAutoUrl(), {
        method: 'GET',
        headers: {
          Accept: 'application/x-ndjson',
          ...authHeaders(token),
        },
        signal: controller.signal,
      });

      await throwIfResponseNotOk(response);

      if (!response.body) {
        throw new Error('No response body from live stream.');
      }

      streamStartedAtRef.current = Date.now();
      setStatusMessage('Streaming EvalPlus session');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const flushBuffer = () => {
        let idx: number;
        let shouldStop = false;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          if (processLine(line)) {
            shouldStop = true;
            break;
          }
        }
        return shouldStop;
      };

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          if (flushBuffer()) break;
        }
        if (done) {
          buffer += decoder.decode();
          flushBuffer();
          break;
        }
      }

        if (!sawEndEventRef.current) {
          setStatusMessage('Stream ended');
          if (movesRef.current.length === 0) {
            setAutoError(
              'Live stream closed before any EvalPlus events. Use prepared replay or verify GET /run/evalplus on the backend.',
            );
          } else {
            setEvalResults(buildResultsSummary());
            setResultsOpen(true);
          }
        }
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        appendSystemLog('Stream aborted.');
        setStatusMessage('Stream paused');
      } else if (error instanceof ApiError) {
        setAutoError(error.message);
        setStatusMessage('Stream error');
        if (error.status === 401) onAuthFailure?.();
      } else {
        const fallback =
          err.message?.includes('Failed to fetch')
            ? 'Unable to reach live stream. Check backend and API base URL.'
            : err.message || 'Failed to stream.';
        setAutoError(fallback);
        setStatusMessage('Stream error');
      }
    } finally {
      setIsPlaying(false);
      abortControllerRef.current = null;
    }
  }, [appendSystemLog, backendLiveAvailable, buildResultsSummary, onAuthFailure, processLine, resetState, token]);

  const handleStopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsPlaying(false);
    setSamplePlaybackPlaying(false);
    setStatusMessage('Stream paused');
  }, []);

  const handleReset = useCallback(() => {
    handleStopStream();
    resetState();
    setResultsOpen(false);
  }, [handleStopStream, resetState]);

  const handleSwitchToLive = useCallback(() => {
    handleStopStream();
    resetState();
    setResultsOpen(false);
    onSetDataSource?.('live');
  }, [handleStopStream, onSetDataSource, resetState]);

  const handleSwitchToSample = useCallback(() => {
    handleStopStream();
    resetState();
    setResultsOpen(false);
    onSetDataSource?.('sample');
  }, [handleStopStream, onSetDataSource, resetState]);

  const loadEvalSample = useCallback(async () => {
    resetState();
    setResultsOpen(false);
    const response = await fetch('/samples/evalplus-auto-sample.json');
    if (!response.ok) throw new Error('Unable to load EvalPlus sample.');
    const data = (await response.json()) as unknown;
    streamStartedAtRef.current = Date.now();
    sawEndEventRef.current = false;

    if (Array.isArray(data)) {
      const collected: EvalPlusRunnerMove[] = [];
      let pk: EvalPlusPassAtK | null = null;
      for (const item of data) {
        const p = item as StreamPayload;
        if (p.type === 'end') {
          sawEndEventRef.current = true;
          const endPk = p.result?.pass_at_k;
          if (endPk && typeof endPk === 'object') pk = endPk;
        }
        if (isEvalPlusEvent(p)) {
          collected.push({
            turn: p.turn,
            player: p.player,
            action: p.action,
            env_state: p.env_state!,
            system_move_record: p.system_move_record,
            timestamp: p.timestamp,
            latency_ms: p.latency_ms,
            task_label: p.task_label,
          });
        }
      }
      setMoves(collected);
      movesRef.current = collected;
      setStepIndex(0);
      if (pk) setPassAtK(pk);
      setStatusMessage('Sample loaded — play, step, or adjust speed.');
    } else {
      const bundle = data as Record<string, unknown>;
      const mv = movesFromPayload(bundle);
      const pk = extractPassAtK(bundle as EvalPlusRunResult);
      setMoves(mv);
      movesRef.current = mv;
      setStepIndex(Math.max(0, mv.length - 1));
      if (pk) setPassAtK(pk);
      setStatusMessage('Loaded experiment bundle');
      setEvalResults(buildResultsSummaryFromRefs(pk));
      setResultsOpen(true);
    }
  }, [buildResultsSummaryFromRefs, resetState]);

  const handlePlaybackPlay = useCallback(async () => {
    if (dataSource === 'live') {
      void startLiveStream();
      return;
    }
    if (movesRef.current.length === 0) {
      try {
        await loadEvalSample();
      } catch (err) {
        setAutoError((err as Error).message || 'Failed to load sample.');
        setStatusMessage('Sample error');
        return;
      }
    }
    setSamplePlaybackPlaying(true);
  }, [dataSource, loadEvalSample, startLiveStream]);

  const handlePlaybackPause = useCallback(() => {
    if (dataSource === 'live') {
      handleStopStream();
      return;
    }
    setSamplePlaybackPlaying(false);
  }, [dataSource, handleStopStream]);

  const handlePlaybackRestart = useCallback(() => {
    if (dataSource === 'live') {
      handleStopStream();
      resetState();
      setResultsOpen(false);
      return;
    }
    setSamplePlaybackPlaying(false);
    setStepIndex(0);
  }, [dataSource, handleStopStream, resetState]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (dataSource !== 'sample') return;
    void loadEvalSample().catch((err) => {
      setAutoError((err as Error).message || 'Failed to load sample.');
      setStatusMessage('Sample error');
    });
  }, [dataSource, loadEvalSample]);

  useEffect(() => {
    if (backendLiveAvailable || dataSource !== 'live') return;
    onSetDataSource?.('sample');
  }, [backendLiveAvailable, dataSource, onSetDataSource]);

  useEffect(() => {
    if (!samplePlaybackPlaying || dataSource !== 'sample') return;
    if (moves.length === 0) return;
    if (stepIndex >= moves.length - 1) {
      setSamplePlaybackPlaying(false);
      return;
    }
    const base = 480;
    const delay = Math.max(50, base / playbackSpeed);
    const id = window.setTimeout(() => {
      setStepIndex((i) => Math.min(Math.max(0, moves.length - 1), i + 1));
    }, delay);
    return () => clearTimeout(id);
  }, [samplePlaybackPlaying, stepIndex, playbackSpeed, dataSource, moves.length]);

  const safeStep = Math.min(stepIndex, Math.max(0, moves.length - 1));
  const prevCode = safeStep > 0 ? moves[safeStep - 1]?.action ?? '' : '';
  const currCode = moves[safeStep]?.action ?? '';
  const sameTaskAsPrev =
    safeStep > 0 && moves[safeStep]?.task_label && moves[safeStep]?.task_label === moves[safeStep - 1]?.task_label;

  const currentMove = moves[safeStep];
  const detectedLanguage = useMemo(() => detectLanguage(prevCode, currCode), [prevCode, currCode]);
  const avgLatency = useMemo(() => {
    const lat = moves.map((m) => m.latency_ms).filter((x): x is number => typeof x === 'number');
    if (!lat.length) return null;
    return Math.round(lat.reduce((a, b) => a + b, 0) / lat.length);
  }, [moves]);

  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));
  const goNext = () => setStepIndex((i) => Math.min(Math.max(0, moves.length - 1), i + 1));

  const playbackActive = dataSource === 'sample' ? samplePlaybackPlaying : isPlaying;
  const playbackPositionLabel =
    moves.length === 0 ? '—' : `Step ${safeStep + 1} / ${moves.length}`;
  const canStepPrev = dataSource === 'sample' && safeStep > 0;
  const canStepNext = dataSource === 'sample' && moves.length > 0 && safeStep < moves.length - 1;

  const handlePlaybackSeek = useCallback((idx: number) => {
    setSamplePlaybackPlaying(false);
    setStepIndex(idx);
  }, []);

  const seekEnabled = dataSource === 'sample' && moves.length > 1;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfdf5_0%,#ffffff_45%)]">
      <div className="sandbox-shell flex min-h-screen flex-col px-3 py-3 sm:px-5 sm:py-5 lg:px-6">
        <div className="rounded-2xl border bg-card/95 shadow-sm backdrop-blur">
          <div className="border-b px-4 py-4 sm:px-6">
            <div className="sandbox-header-grid">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Button variant="outline" size="sm" onClick={onBack} className="shrink-0">
                    ← Back
                  </Button>
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{environmentLabel}</h1>
                  <Badge variant="secondary">EvalPlus</Badge>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {backendLiveAvailable
                    ? 'Code submissions and diffs are rendered from bundled sample events; live streaming uses the API when enabled.'
                    : 'Standalone build: submissions and diffs use bundled sample events only.'}
                </p>
              </div>

              <div className="sandbox-controls-panel">
                <div className="sandbox-controls-top">
                  <Badge variant="outline">{dataSource === 'live' ? 'Live stream' : 'Prepared replay'}</Badge>
                  <Badge variant={autoError ? 'destructive' : playbackActive ? 'default' : 'secondary'}>
                    {autoError ? 'Error' : playbackActive ? 'Playing' : 'Ready'}
                  </Badge>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant={dataSource === 'sample' ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-8"
                      onClick={handleSwitchToSample}
                      disabled={dataSource === 'sample'}
                    >
                      Replay
                    </Button>
                    <Button
                      type="button"
                      variant={dataSource === 'live' ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-8"
                      onClick={handleSwitchToLive}
                      disabled={dataSource === 'live' || !backendLiveAvailable}
                      title={!backendLiveAvailable ? 'Not available without a CrewForge API server' : undefined}
                    >
                      Live
                    </Button>
                  </div>
                </div>
                <SandboxPlaybackControls
                  isLive={dataSource === 'live'}
                  isPlaying={playbackActive}
                  onPlay={() => void handlePlaybackPlay()}
                  onPause={handlePlaybackPause}
                  onRestart={handlePlaybackRestart}
                  onPrev={goPrev}
                  onNext={goNext}
                  canPrev={canStepPrev}
                  canNext={canStepNext}
                  speed={playbackSpeed}
                  onSpeedChange={setPlaybackSpeed}
                  positionLabel={playbackPositionLabel}
                  disabled={!!autoError}
                  hideStepControls={dataSource === 'live'}
                  seekMin={0}
                  seekMax={Math.max(0, moves.length - 1)}
                  seekValue={safeStep}
                  onSeekChange={seekEnabled ? handlePlaybackSeek : undefined}
                  seekLabel="Step"
                />
                <div className="sandbox-controls-actions mt-2">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Full reset
                  </Button>
                </div>
              </div>
            </div>

            <div className="sandbox-top-stats mt-4">
              <Card className="p-3">
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground">Status</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">{statusMessage}</div>
              </Card>
              <Card className="p-3">
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground">Submissions</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">{moves.length}</div>
              </Card>
              <Card className="p-3">
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground">Step</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">
                  {moves.length === 0 ? '—' : `${safeStep + 1} / ${moves.length}`}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground">Avg latency</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">
                  {avgLatency === null ? '—' : `${avgLatency} ms`}
                </div>
              </Card>
            </div>
            {autoError && (
              <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {autoError}
              </div>
            )}
          </div>

          <div className="sandbox-main-grid p-4 sm:p-6">
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <div className="border-b px-4 py-3">
                  <h3 className="text-base font-semibold">Code</h3>
                  <p className="text-sm text-muted-foreground">
                    {showDiff
                      ? safeStep === 0
                        ? 'First submission: the diff compares to an empty starting point. Copy still copies the full file.'
                        : 'Compared to the previous step: green lines were added, red lines were removed. Copy copies the full solution only (not the diff).'
                      : 'Full solution for this step. Turn on “Show diff” to see additions and removals vs. the previous step.'}
                  </p>
                </div>
                <div className="space-y-3 p-4 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{currentMove?.task_label ?? '—'}</Badge>
                    </div>
                    {currentMove && (
                      <span className="text-xs text-muted-foreground">
                        {currentMove.player} · latency {typeof currentMove.latency_ms === 'number' ? `${currentMove.latency_ms} ms` : '—'}
                        {typeof currentMove.system_move_record?.total_tokens === 'number'
                          ? ` · ${currentMove.system_move_record.total_tokens} tok`
                          : ''}
                      </span>
                    )}
                  </div>
                  <div className="evalplus-ide-panel overflow-hidden">
                    <div className="evalplus-ide-chrome evalplus-ide-chrome--workspace">
                      <span className="evalplus-ide-chrome-label">{showDiff ? 'Diff' : 'solution.py'}</span>
                      <div className="evalplus-ide-chrome-trail">
                        <div className="evalplus-diff-toggle">
                          <Switch
                            id="evalplus-show-diff"
                            checked={showDiff}
                            onCheckedChange={setShowDiff}
                            aria-label="Toggle diff view"
                          />
                          <label htmlFor="evalplus-show-diff" className="evalplus-diff-toggle-label">
                            Show diff
                          </label>
                        </div>
                        {(prevCode || currCode).trim() ? (
                          <span className="evalplus-ide-lang-pill">{detectedLanguage}</span>
                        ) : null}
                        <CopyCodeButton textToCopy={currCode} disabled={!currCode.trim()} />
                      </div>
                    </div>
                    <motion.div
                      key={`${safeStep}-${showDiff}`}
                      initial={{ opacity: 0.92, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      {showDiff ? (
                        <EvalPlusCodeDiff before={prevCode} after={currCode} contentOnly />
                      ) : (
                        <IdeHighlightedCode code={currCode} contentOnly emptyLabel="—" />
                      )}
                    </motion.div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="sandbox-log-panel p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="sandbox-log-title">Submission log</h3>
                    <p className="sandbox-log-subtitle">Turn, task, and latency from stream</p>
                  </div>
                  <Badge variant="outline">{moves.length} entries</Badge>
                </div>
                <div className="max-h-[18rem] space-y-3 overflow-auto pr-1">
                  {moves.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No submissions yet. Replay the sample or connect to the live backend.
                    </div>
                  ) : (
                    moves.map((m, idx) => (
                      <button
                        key={`${m.turn}-${idx}`}
                        type="button"
                        onClick={() => setStepIndex(idx)}
                        className={`sandbox-move-item w-full text-left transition-colors ${idx === safeStep ? 'ring-2 ring-primary/40' : ''}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="sandbox-move-uci">
                            {m.turn + 1}. {m.task_label ?? `task ${completedTaskOrdinal(m.env_state)}`}
                          </div>
                          <Badge variant="secondary">{m.player}</Badge>
                        </div>
                        <div className="sandbox-move-meta mt-2">
                          <span>latency {typeof m.latency_ms === 'number' ? `${m.latency_ms} ms` : '—'}</span>
                          <span>
                            tokens{' '}
                            {typeof m.system_move_record?.total_tokens === 'number'
                              ? m.system_move_record.total_tokens
                              : '—'}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </Card>

              <Card className="sandbox-log-panel p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="sandbox-log-title">Pass@k</h3>
                    <p className="sandbox-log-subtitle">From end event or bundled result</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowBackendLog((v) => !v)}>
                    {showBackendLog ? 'Hide raw log' : 'Raw log'}
                  </Button>
                </div>
                {passAtK && Object.keys(passAtK).length > 0 ? (
                  <div className="space-y-1 font-mono text-sm">
                    {Object.entries(passAtK).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{k}</span>
                        <span>{typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
                {showBackendLog && (
                  <div className="mt-3 max-h-32 overflow-auto space-y-1 text-xs text-muted-foreground">
                    {systemLog.length === 0 ? <span>Empty</span> : systemLog.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      <EvalPlusResultsDialog
        open={resultsOpen && evalResults !== null}
        onClose={() => setResultsOpen(false)}
        onRunAgain={() => {
          setResultsOpen(false);
          if (dataSource === 'sample') void loadEvalSample();
          else void startLiveStream();
        }}
        results={evalResults}
      />
    </div>
  );
}
