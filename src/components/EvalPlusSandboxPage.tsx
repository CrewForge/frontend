import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { EvalPlusResultsDialog, type EvalPlusResultsSummary } from './EvalPlusResultsDialog';

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

function waitWithAbort(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      cleanup();
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    signal.addEventListener('abort', onAbort, { once: true });
  });
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
  const autoStartedSampleRef = useRef(false);
  const [showBackendLog, setShowBackendLog] = useState(false);
  const [systemLog, setSystemLog] = useState<string[]>([]);

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
  }, []);

  const buildResultsSummary = useCallback((passAtKOverride?: EvalPlusPassAtK | null): EvalPlusResultsSummary => {
    const durationMs = streamStartedAtRef.current ? Date.now() - streamStartedAtRef.current : 0;
    const list = movesRef.current;
    const latencies = list.map((m) => m.latency_ms).filter((x): x is number => typeof x === 'number');
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
    let tokens = 0;
    for (const m of list) {
      const t = m.system_move_record?.total_tokens;
      if (typeof t === 'number') tokens += t;
    }
    const pk = passAtKOverride !== undefined ? passAtKOverride : passAtK;
    return {
      submissions: list.length,
      durationLabel: formatDuration(durationMs),
      averageLatencyMs: avgLatency,
      totalTokens: tokens > 0 ? tokens : null,
      passAtK: pk,
      summaryLine:
        'Metrics are derived from streamed RunnerMoveRecord payloads (CrewForge runner). Pass@k comes from the final end event or bundled experiment JSON.',
    };
  }, [passAtK]);

  const processPayload = useCallback(
    (payload: StreamPayload) => {
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
        setEvalResults(buildResultsSummary(pk && typeof pk === 'object' ? pk : null));
        setResultsOpen(true);
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
  }, [appendSystemLog, buildResultsSummary, onAuthFailure, processLine, resetState, token]);

  const startSampleReplay = useCallback(async () => {
    abortControllerRef.current?.abort();
    resetState();
    setResultsOpen(false);
    setIsPlaying(true);
    setStatusMessage('Loading EvalPlus sample…');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/samples/evalplus-auto-sample.json', { signal: controller.signal });
      if (!response.ok) throw new Error('Unable to load EvalPlus sample.');
      const data = (await response.json()) as unknown;

      streamStartedAtRef.current = Date.now();

      if (Array.isArray(data)) {
        setStatusMessage('Replaying prepared EvalPlus run');
        for (const item of data) {
          if (controller.signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
          const shouldStop = processPayload(item as StreamPayload);
          if (shouldStop) break;
          await waitWithAbort(480, controller.signal);
        }
        if (!sawEndEventRef.current) {
          setEvalResults(buildResultsSummary(null));
          setResultsOpen(true);
        }
      } else {
        const bundle = data as Record<string, unknown>;
        const mv = movesFromPayload(bundle);
        const pk = extractPassAtK(bundle as EvalPlusRunResult);
        setMoves(mv);
        movesRef.current = mv;
        setStepIndex(Math.max(0, mv.length - 1));
        if (pk) setPassAtK(pk);
        setStatusMessage('Loaded experiment bundle');
        setEvalResults(buildResultsSummary(pk));
        setResultsOpen(true);
      }
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        appendSystemLog('Replay stopped.');
        setStatusMessage('Replay paused');
      } else {
        setAutoError(err.message || 'Failed to load sample.');
        setStatusMessage('Sample error');
      }
    } finally {
      setIsPlaying(false);
      abortControllerRef.current = null;
    }
  }, [appendSystemLog, buildResultsSummary, processPayload, resetState]);

  const handleStopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsPlaying(false);
    setStatusMessage('Stream paused');
  }, []);

  const handleReset = useCallback(() => {
    handleStopStream();
    resetState();
    setResultsOpen(false);
  }, [handleStopStream, resetState]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (dataSource !== 'sample') {
      autoStartedSampleRef.current = false;
      return;
    }
    if (autoStartedSampleRef.current) return;
    autoStartedSampleRef.current = true;
    void startSampleReplay();
  }, [dataSource, startSampleReplay]);

  const safeStep = Math.min(stepIndex, Math.max(0, moves.length - 1));
  const prevCode = safeStep > 0 ? moves[safeStep - 1]?.action ?? '' : '';
  const currCode = moves[safeStep]?.action ?? '';
  const sameTaskAsPrev =
    safeStep > 0 && moves[safeStep]?.task_label && moves[safeStep]?.task_label === moves[safeStep - 1]?.task_label;

  const currentMove = moves[safeStep];
  const avgLatency = useMemo(() => {
    const lat = moves.map((m) => m.latency_ms).filter((x): x is number => typeof x === 'number');
    if (!lat.length) return null;
    return Math.round(lat.reduce((a, b) => a + b, 0) / lat.length);
  }, [moves]);

  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));
  const goNext = () => setStepIndex((i) => Math.min(Math.max(0, moves.length - 1), i + 1));

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
                  Code submissions and diffs are rendered from bundled sample events and do not require a backend process.
                </p>
              </div>

              <div className="sandbox-controls-panel">
                <div className="sandbox-controls-top">
                  <Badge variant="outline">Prepared replay</Badge>
                  <Badge variant={autoError ? 'destructive' : isPlaying ? 'default' : 'secondary'}>
                    {autoError ? 'Error' : isPlaying ? 'Running' : 'Ready'}
                  </Badge>
                </div>
                <div className="sandbox-controls-actions">
                  {!isPlaying ? (
                    <Button
                      onClick={() => void startSampleReplay()}
                      className="min-w-[10rem] font-medium"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Replay prepared run
                    </Button>
                  ) : (
                    <Button onClick={handleStopStream} variant="outline" className="min-w-[10rem] font-medium">
                      <Pause className="mr-2 h-4 w-4" />
                      Stop
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleReset} aria-label="Reset">
                    <RotateCcw className="h-4 w-4" />
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
                  <h3 className="text-base font-semibold">Code evolution</h3>
                  <p className="text-sm text-muted-foreground">
                    {sameTaskAsPrev
                      ? 'Diff vs previous submission for the same task label.'
                      : safeStep === 0
                        ? 'First submission (diff compares against empty previous).'
                        : 'New task or different label - diff vs previous step.'}
                  </p>
                </div>
                <div className="space-y-3 p-4 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={goPrev}
                        disabled={safeStep <= 0}
                        aria-label="Previous step"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={goNext}
                        disabled={safeStep >= moves.length - 1 || moves.length === 0}
                        aria-label="Next step"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
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
                  <motion.div
                    key={safeStep}
                    initial={{ opacity: 0.92, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <EvalPlusCodeDiff before={prevCode} after={currCode} />
                  </motion.div>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b px-4 py-3">
                  <h3 className="text-base font-semibold">Current solution</h3>
                  <p className="text-sm text-muted-foreground">Full submitted code for this step</p>
                </div>
                <pre className="max-h-[20rem] overflow-auto p-4 font-mono text-[11px] leading-relaxed sm:text-xs">
                  {currCode || '—'}
                </pre>
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
          if (dataSource === 'sample') void startSampleReplay();
          else void startLiveStream();
        }}
        results={evalResults}
      />
    </div>
  );
}
