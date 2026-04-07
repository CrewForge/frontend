import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { SandboxPlaybackControls } from './SandboxPlaybackControls';
import { motion, useReducedMotion } from 'motion/react';
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
import { ExperimentPicker } from './experiments/ExperimentPicker';
import { InteractionGraphSection } from './interaction-graph/InteractionGraphSection';
import { EvalPlusResultsDialog, type EvalPlusResultsSummary } from './EvalPlusResultsDialog';
import { resolveEvalPlusHighlightLanguage } from '../lib/syntaxHighlight';
import { stripMarkdownCodeFence } from '../lib/evalplusMarkdownFence';
import type { ExperimentDataset, ExperimentManifestEntry } from '../lib/experiments/types';
import { loadManifest, normalizeLoadedDataset } from '../lib/experiments/load';
import { datasetToEvalPlusMoves } from '../lib/experiments/normalize';
import { scrollChildIntoContainer } from '../lib/scrollChildIntoContainer';
import {
  SandboxVisualizationRoot,
  SandboxEnvironmentHeader,
  SandboxVizToolbarBlock,
  SandboxPrimaryCard,
  SandboxSideLogCard,
  SandboxSecondaryPanel,
  SandboxSidePanelHeader,
} from './sandbox-visualization/SandboxVisualizationTemplate';

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
  const environmentLabel = 'Code Dataspace';

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
  const [manifestEntries, setManifestEntries] = useState<ExperimentManifestEntry[]>([]);
  const [selectedDatasetPath, setSelectedDatasetPath] = useState<string | null>(null);
  const [activeDataset, setActiveDataset] = useState<ExperimentDataset | null>(null);
  const [wideSidePanel, setWideSidePanel] = useState(false);
  const submissionLogScrollRef = useRef<HTMLDivElement | null>(null);
  const activeSubmissionRef = useRef<HTMLButtonElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

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

  useEffect(() => {
    void loadManifest()
      .then((entries) => {
        setManifestEntries(entries);
        const evalEntries = entries.filter((entry) => entry.envType === 'evalplus');
        if (evalEntries.length === 0) return;
        setSelectedDatasetPath((prev) => prev ?? evalEntries[0].path);
      })
      .catch((err) => {
        setAutoError((err as Error).message || 'Failed to load experiment manifest.');
      });
  }, []);

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
    if (!selectedDatasetPath) {
      throw new Error('No EvalPlus experiment selected.');
    }
    resetState();
    setResultsOpen(false);
    const res = await fetch(selectedDatasetPath);
    if (!res.ok) {
      throw new Error(`Failed to load experiment dataset (${res.status})`);
    }
    const raw = await res.json();
    streamStartedAtRef.current = Date.now();
    sawEndEventRef.current = false;

    if (Array.isArray(raw)) {
      const collected: EvalPlusRunnerMove[] = [];
      let pk: EvalPlusPassAtK | null = null;
      for (const item of raw) {
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
      setActiveDataset({ moves: collected as ExperimentDataset['moves'] });
      setStatusMessage('Sample loaded — play, step, or adjust speed.');
    } else {
      const bundle = normalizeLoadedDataset(raw) as ExperimentDataset;
      const mv = datasetToEvalPlusMoves(bundle) as unknown as EvalPlusRunnerMove[];
      const direct = bundle.result;
      const parsedResult =
        typeof direct === 'string'
          ? (JSON.parse(direct) as EvalPlusPassAtK)
          : (direct as EvalPlusPassAtK | undefined);
      const pk = extractPassAtK(bundle as unknown as EvalPlusRunResult) ?? (parsedResult && typeof parsedResult === 'object' ? parsedResult : null);
      setMoves(mv);
      movesRef.current = mv;
      setStepIndex(0);
      if (pk) setPassAtK(pk);
      setStatusMessage('Loaded experiment bundle');
      setEvalResults(null);
      setResultsOpen(false);
      setActiveDataset(bundle);
    }
  }, [resetState, selectedDatasetPath]);

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
    const total = movesRef.current.length;
    if (total > 0) {
      setStepIndex((i) => (i >= total - 1 ? 0 : i));
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
    if (!selectedDatasetPath) return;
    void loadEvalSample().catch((err) => {
      setAutoError((err as Error).message || 'Failed to load sample.');
      setStatusMessage('Sample error');
    });
  }, [dataSource, loadEvalSample, selectedDatasetPath]);

  useEffect(() => {
    if (backendLiveAvailable || dataSource !== 'live') return;
    onSetDataSource?.('sample');
  }, [backendLiveAvailable, dataSource, onSetDataSource]);

  useEffect(() => {
    if (!samplePlaybackPlaying || dataSource !== 'sample') return;
    if (moves.length === 0) return;
    const base = 480;
    const delay = Math.max(50, base / playbackSpeed);
    const last = moves.length - 1;
    const id = window.setTimeout(() => {
      setStepIndex((i) => {
        if (i >= last) {
          queueMicrotask(() => {
            setSamplePlaybackPlaying(false);
          });
          return i;
        }
        return i + 1;
      });
    }, delay);
    return () => clearTimeout(id);
  }, [samplePlaybackPlaying, stepIndex, playbackSpeed, dataSource, moves.length]);

  const safeStep = Math.min(stepIndex, Math.max(0, moves.length - 1));

  useEffect(() => {
    const container = submissionLogScrollRef.current;
    const el = activeSubmissionRef.current;
    if (!container || !el) return;
    const id = requestAnimationFrame(() => {
      scrollChildIntoContainer(container, el, {
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        padding: 10,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [safeStep, prefersReducedMotion]);

  const prevCode = safeStep > 0 ? moves[safeStep - 1]?.action ?? '' : '';
  const currCode = moves[safeStep]?.action ?? '';

  const prevFence = useMemo(() => stripMarkdownCodeFence(prevCode), [prevCode]);
  const currFence = useMemo(() => stripMarkdownCodeFence(currCode), [currCode]);
  const displayPrev = prevFence.code;
  const displayCurr = currFence.code;
  const evalPlusHighlightLang = useMemo(
    () => resolveEvalPlusHighlightLanguage(displayPrev, displayCurr, currFence.language ?? prevFence.language),
    [displayPrev, displayCurr, currFence.language, prevFence.language],
  );

  const currentMove = moves[safeStep];
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

  const evalMetricsItems = useMemo(
    () => [
      { key: 'status', label: 'Status', value: statusMessage },
      { key: 'submissions', label: 'Submissions', value: moves.length },
      {
        key: 'latency',
        label: 'Avg latency',
        value: avgLatency === null ? '—' : `${avgLatency} ms`,
      },
    ],
    [avgLatency, moves.length, statusMessage],
  );

  const codeDescription = showDiff
    ? safeStep === 0
      ? ''
      : ''
    : '';

  return (
    <>
      <SandboxVisualizationRoot>
        <SandboxEnvironmentHeader
          onBack={onBack}
          title={environmentLabel}
          dataSource={dataSource}
          playbackActive={playbackActive}
          errorMessage={autoError}
          backendLiveAvailable={backendLiveAvailable}
          onSwitchToSample={handleSwitchToSample}
          onSwitchToLive={handleSwitchToLive}
          subtitle={
            backendLiveAvailable
              ? 'Step through bundled runs or connect the API for a live stream.'
              : 'Bundled datasets only. Add a CrewForge API server to enable live streams.'
          }
          metricsStrip={
            <ExperimentPicker
              entries={manifestEntries}
              envType="evalplus"
              selectedPath={selectedDatasetPath}
              onSelectPath={setSelectedDatasetPath}
            />
          }
        />

        <div className="sandbox-main-stage p-4 sm:p-5">
          <div
            className={`sandbox-main-grid sandbox-main-grid--with-graph${wideSidePanel ? ' sandbox-main-grid--side-focus' : ''}`}
          >
            <div className="min-w-0">
              <SandboxPrimaryCard
                  title="Code"
                  description={codeDescription}
                  toolbar={
                    <SandboxVizToolbarBlock
                      dataSource={dataSource}
                      playbackActive={playbackActive}
                      errorMessage={autoError}
                      onFullReset={handleReset}
                      playbackControls={
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
                      }
                    />
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{currentMove?.task_label ?? '—'}</Badge>
                    </div>
                    {currentMove && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {currentMove.player} · latency {typeof currentMove.latency_ms === 'number' ? `${currentMove.latency_ms} ms` : '—'}
                        {typeof currentMove.system_move_record?.total_tokens === 'number'
                          ? ` · ${currentMove.system_move_record.total_tokens} tok`
                          : ''}
                      </span>
                    )}
                  </div>
                  <div className="evalplus-ide-panel mt-3 overflow-hidden">
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
                        {(displayPrev || displayCurr).trim() ? (
                          <span className="evalplus-ide-lang-pill">{evalPlusHighlightLang}</span>
                        ) : null}
                        <CopyCodeButton textToCopy={displayCurr} disabled={!displayCurr.trim()} />
                      </div>
                    </div>
                    <motion.div
                      key={`${safeStep}-${showDiff}`}
                      initial={{ opacity: 0.92, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      {showDiff ? (
                        <EvalPlusCodeDiff
                          before={displayPrev}
                          after={displayCurr}
                          highlightLanguage={evalPlusHighlightLang}
                          contentOnly
                        />
                      ) : (
                        <IdeHighlightedCode
                          code={displayCurr}
                          language={evalPlusHighlightLang}
                          contentOnly
                          emptyLabel="—"
                        />
                      )}
                    </motion.div>
                  </div>
                </SandboxPrimaryCard>
            </div>

            <aside className="min-w-0 flex flex-col gap-4">
              <SandboxSidePanelHeader expanded={wideSidePanel} onToggle={() => setWideSidePanel((v) => !v)} />
              <div className="sandbox-side-stack min-w-0 gap-3.5">
              <InteractionGraphSection
                dataset={activeDataset}
                layout="sideColumn"
                sideColumnExpanded={wideSidePanel}
                evidenceFocusTurn={
                  moves.length > 0 && typeof moves[safeStep]?.turn === 'number' ? moves[safeStep]!.turn : null
                }
              />
              <SandboxSideLogCard
                className="sandbox-move-log sandbox-log-panel gap-0"
                title="Submission log"
                subtitle="Turn, task, and latency"
                entryCount={moves.length}
              >
                <div ref={submissionLogScrollRef} className="sandbox-move-log-scroll">
                  {moves.length === 0 ? (
                    <div className="rounded-md border border-dashed px-3 py-2.5 text-xs leading-snug text-muted-foreground">
                      No submissions yet. Replay the loaded experiment or connect to the live backend.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {moves.map((m, idx) => (
                        <button
                          key={`${m.turn}-${idx}`}
                          ref={idx === safeStep ? activeSubmissionRef : undefined}
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
                                {typeof m.system_move_record?.total_tokens === 'number' ? m.system_move_record.total_tokens : '—'}
                              </span>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </SandboxSideLogCard>

              <SandboxSecondaryPanel
                className="sandbox-passatk-panel p-4"
                title="Pass@k"
                subtitle="End event or bundle"
                headerRight={
                  <Button variant="ghost" size="sm" onClick={() => setShowBackendLog((v) => !v)}>
                    {showBackendLog ? 'Hide log' : 'Raw log'}
                  </Button>
                }
              >
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
              </SandboxSecondaryPanel>
              </div>
            </aside>
          </div>
        </div>
      </SandboxVisualizationRoot>

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
    </>
  );
}
