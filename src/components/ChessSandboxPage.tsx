import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ChessBoard, BoardState, type BoardMoveAnimation } from './ChessBoard';
import { GameResultsDialog } from './GameResultsDialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { SandboxPlaybackControls } from './SandboxPlaybackControls';
import { motion, useReducedMotion } from 'motion/react';
import { Chess } from 'chess.js';
import { ApiError, authHeaders, streamChessAutoUrl, throwIfResponseNotOk } from '../lib/api';
import { materialAdvantageFromGame } from '../lib/chessCaptures';
import { formatCentipawnDelta, formatEvalPawns } from '../lib/chessEval';
import type { GameResultsSummary } from './GameResultsDialog';
import { ChessEvalBar } from './ChessEvalBar';
import { ChessMoveList } from './ChessMoveList';
import { ChessMaterial } from './ChessMaterial';
import { ExperimentPicker } from './experiments/ExperimentPicker';
import { InteractionGraphSection } from './interaction-graph/InteractionGraphSection';
import type { ExperimentDataset, ExperimentManifestEntry } from '../lib/experiments/types';
import { loadDataset, loadManifest } from '../lib/experiments/load';
import { datasetToChessReplayPayloads, turnAtChessReplayStep } from '../lib/experiments/normalize';
import { scrollChildIntoContainer } from '../lib/scrollChildIntoContainer';
import {
  SandboxVisualizationRoot,
  SandboxEnvironmentHeader,
  SandboxMetricsStrip,
  SandboxVizToolbarBlock,
  SandboxPrimaryCard,
  SandboxSideLogCard,
  SandboxSidePanelHeader,
} from './sandbox-visualization/SandboxVisualizationTemplate';

const sandboxSplitLayoutTransition = { type: 'spring' as const, stiffness: 380, damping: 38 };

export interface ChessSandboxPageProps {
  token: string;
  onBack: () => void;
  dataSource?: 'live' | 'sample';
  onSetDataSource?: (source: 'live' | 'sample') => void;
  /** Clears session when stream returns 401 (expired / invalid token). */
  onAuthFailure?: () => void;
  /** When false, only bundled replay is available (standalone build). */
  backendLiveAvailable?: boolean;
}

type MoveLogEntry = {
  ply: number;
  uci: string;
  /** Standard algebraic notation from chess.js (includes +, #, =Q, …). */
  san: string;
  player: string;
  reasoning?: string;
  centipawnsTotal?: number;
  centipawnsCurrent?: number;
  latencyMs?: number;
};

type StreamPayload = {
  type?: string;
  ply?: number;
  uci?: string;
  player?: string;
  reasoning?: string;
  centipawns_total?: number;
  centipawns_current?: number;
  latency_ms?: number;
  message?: string;
};

function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return m > 0 ? `${m}:${rs.toString().padStart(2, '0')}` : `${rs}s`;
}

const INFERRED_NOTE = 'Inferred client-side from streamed moves.';

function outcomeFromChess(game: Chess): { winner: 'white' | 'black' | 'draw'; summaryLine: string; pgnResult: string } {
  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'black' : 'white';
    return {
      winner,
      summaryLine: 'Checkmate.',
      pgnResult: winner === 'white' ? '1-0' : '0-1',
    };
  }

  if (game.isStalemate()) {
    return { winner: 'draw', summaryLine: 'Stalemate.', pgnResult: '1/2-1/2' };
  }

  if (game.isInsufficientMaterial()) {
    return { winner: 'draw', summaryLine: 'Draw by insufficient material.', pgnResult: '1/2-1/2' };
  }

  if (game.isThreefoldRepetition()) {
    return { winner: 'draw', summaryLine: 'Draw by threefold repetition.', pgnResult: '1/2-1/2' };
  }

  if (game.isDraw()) {
    return { winner: 'draw', summaryLine: 'Draw.', pgnResult: '1/2-1/2' };
  }

  return {
    winner: 'draw',
    summaryLine: 'Session ended before a terminal result.',
    pgnResult: '*',
  };
}

const pieceTypeMap: Record<string, 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn'> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

function algebraicToRC(sq: string): { row: number; col: number } {
  const file = sq.charCodeAt(0) - 97;
  const rank = 8 - Number(sq[1]);
  return { row: rank, col: file };
}

const buildBoardState = (game: Chess, lastMove?: { from: string; to: string } | null): BoardState => {
  const boardRepresentation = game.board();
  const boardState: BoardState = boardRepresentation.map((row) =>
    row.map((square) => {
      if (!square) {
        return { piece: null };
      }
      return {
        piece: {
          type: pieceTypeMap[square.type],
          color: square.color === 'w' ? 'white' : 'black',
        },
      };
    }),
  );

  if (lastMove) {
    const apply = (sq: string, kind: 'lastFrom' | 'lastTo') => {
      const { row, col } = algebraicToRC(sq);
      if (row < 0 || row > 7 || col < 0 || col > 7) return;
      const cur = boardState[row][col];
      boardState[row][col] = {
        piece: cur.piece ?? null,
        highlight: kind,
      };
    };
    apply(lastMove.from, 'lastFrom');
    apply(lastMove.to, 'lastTo');
  }

  return boardState;
};

const createInitialBoard = () => buildBoardState(new Chess(), null);

export function ChessSandboxPage({
  token,
  onBack,
  dataSource = 'sample',
  onSetDataSource,
  onAuthFailure,
  backendLiveAvailable = true,
}: ChessSandboxPageProps) {
  const mode: 'user' | 'stockfish' = 'stockfish';
  const environmentLabel = 'Strategy Workspace';
  const [isPlaying, setIsPlaying] = useState(false);
  const [board, setBoard] = useState<BoardState>(createInitialBoard());
  const [resultsOpen, setResultsOpen] = useState(false);
  const [gameResults, setGameResults] = useState<GameResultsSummary | null>(null);
  const [moveLogEntries, setMoveLogEntries] = useState<MoveLogEntry[]>([]);
  const moveLogRef = useRef<MoveLogEntry[]>([]);
  const [latestMove, setLatestMove] = useState<MoveLogEntry | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Awaiting start');
  const abortControllerRef = useRef<AbortController | null>(null);
  const chessRef = useRef(new Chess());
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamStartedAtRef = useRef<number | null>(null);
  const sawEndEventRef = useRef(false);
  const [moveAnim, setMoveAnim] = useState<BoardMoveAnimation | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [replayPayloads, setReplayPayloads] = useState<StreamPayload[]>([]);
  const replayPayloadsRef = useRef<StreamPayload[]>([]);
  const [replayCursor, setReplayCursor] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [samplePlaybackPlaying, setSamplePlaybackPlaying] = useState(false);
  const moveLogScrollRef = useRef<HTMLDivElement>(null);
  const activeMoveLogItemRef = useRef<HTMLDivElement | null>(null);
  const [manifestEntries, setManifestEntries] = useState<ExperimentManifestEntry[]>([]);
  const [selectedDatasetPath, setSelectedDatasetPath] = useState<string | null>(null);
  const [activeDataset, setActiveDataset] = useState<ExperimentDataset | null>(null);
  const [wideSidePanel, setWideSidePanel] = useState(false);

  const chessMovePayloads = useMemo(
    () => replayPayloads.filter((p) => p?.type === 'event' && p?.uci),
    [replayPayloads],
  );
  const chessMovePayloadsRef = useRef<StreamPayload[]>([]);
  useEffect(() => {
    chessMovePayloadsRef.current = chessMovePayloads;
  }, [chessMovePayloads]);

  const resetBoardState = useCallback(() => {
    if (animTimeoutRef.current) {
      clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = null;
    }
    setMoveAnim(null);
    chessRef.current = new Chess();
    setBoard(buildBoardState(chessRef.current, null));
    moveLogRef.current = [];
    setMoveLogEntries([]);
    setLatestMove(null);
    setAutoError(null);
    setStatusMessage('Awaiting start');
    setGameResults(null);
    streamStartedAtRef.current = null;
    sawEndEventRef.current = false;
    setReplayCursor(-1);
  }, []);

  const buildResultsSummary = useCallback((): GameResultsSummary => {
    const durationMs = streamStartedAtRef.current ? Date.now() - streamStartedAtRef.current : 0;
    const outcome = outcomeFromChess(chessRef.current);
    const keyMoments = moveLogRef.current
      .filter((entry) => entry.reasoning && entry.reasoning !== 'Engine best move')
      .sort((a, b) => {
        const aScore = Math.abs(a.centipawnsCurrent ?? 0) + Math.round((a.latencyMs ?? 0) / 60);
        const bScore = Math.abs(b.centipawnsCurrent ?? 0) + Math.round((b.latencyMs ?? 0) / 60);
        return bScore - aScore;
      })
      .slice(0, 3)
      .map((entry) => {
        const swing = typeof entry.centipawnsCurrent === 'number' ? `${entry.centipawnsCurrent > 0 ? '+' : ''}${entry.centipawnsCurrent}` : '—';
        return `Move ${entry.ply + 1} (${entry.san}): ${entry.reasoning} Eval swing ${swing}.`;
      });
    const movesWithLatency = moveLogRef.current.filter((entry) => typeof entry.latencyMs === 'number');
    const averageLatencyMs = movesWithLatency.length
      ? Math.round(
          movesWithLatency.reduce((sum, entry) => sum + (entry.latencyMs ?? 0), 0) / movesWithLatency.length,
        )
      : null;
    const finalMove = moveLogRef.current[moveLogRef.current.length - 1];

    return {
      winner: outcome.winner,
      moves: moveLogRef.current.length,
      durationLabel: formatDuration(durationMs),
      pgnResult: outcome.pgnResult,
      summaryLine: outcome.summaryLine,
      keyMoments,
      averageLatencyMs,
      finalCentipawnsCurrent: finalMove?.centipawnsCurrent ?? null,
      finalCentipawnsTotal: finalMove?.centipawnsTotal ?? null,
    };
  }, []);

  const processPayload = useCallback(
    (payload: StreamPayload, options?: { suppressDialogs?: boolean }) => {
      if (!payload || typeof payload !== 'object') {
        return false;
      }

      if (payload.type === 'event' && payload.uci) {
        try {
          const fenBefore = chessRef.current.fen();
          const played = chessRef.current.move(payload.uci, { sloppy: true });
          if (!played) {
            return false;
          }
          const lastHighlight = { from: played.from, to: played.to };
          const usePieceAnim =
            !prefersReducedMotion &&
            !played.isKingsideCastle() &&
            !played.isQueensideCastle();

          if (animTimeoutRef.current) {
            clearTimeout(animTimeoutRef.current);
            animTimeoutRef.current = null;
          }

          if (usePieceAnim) {
            const beforeGame = new Chess(fenBefore);
            /* Show last-move square tint immediately; piece still flies via overlay. */
            setBoard(buildBoardState(beforeGame, lastHighlight));
            const victimFly = played.isCapture() && !played.isEnPassant();
            setMoveAnim({
              from: played.from,
              to: played.to,
              pieceType: pieceTypeMap[played.piece],
              pieceColor: played.color === 'w' ? 'white' : 'black',
              capturedType: played.captured ? pieceTypeMap[played.captured] : undefined,
              capturedColor: played.captured
                ? played.color === 'w'
                  ? 'black'
                  : 'white'
                : undefined,
              victimFly,
            });
            /* Mover spring ~0.3s; victim fly is 0.42s — don’t clear overlay early on captures. */
            const settleMs = victimFly ? 430 : 340;
            animTimeoutRef.current = window.setTimeout(() => {
              setBoard(buildBoardState(chessRef.current, lastHighlight));
              setMoveAnim(null);
              animTimeoutRef.current = null;
            }, settleMs);
          } else {
            setMoveAnim(null);
            setBoard(buildBoardState(chessRef.current, lastHighlight));
          }

          const nextEntry: MoveLogEntry = {
            ply: typeof payload.ply === 'number' ? payload.ply : moveLogRef.current.length,
            uci: payload.uci,
            san: played.san,
            player: payload.player || 'agent',
            reasoning: payload.reasoning,
            centipawnsTotal: payload.centipawns_total,
            centipawnsCurrent: payload.centipawns_current,
            latencyMs: payload.latency_ms,
          };
          setLatestMove(nextEntry);
          setMoveLogEntries((prev) => {
            const next = [...prev, nextEntry];
            moveLogRef.current = next;
            return next;
          });
          setStatusMessage(`Last move: ${played.san} (${payload.player || 'agent'})`);
        } catch {
          /* ignore invalid move */
        }
        return false;
      }

      if (payload.type === 'log') {
        return false;
      }

      if (payload.type === 'end') {
        sawEndEventRef.current = true;
        setStatusMessage('Environment complete');
        if (!options?.suppressDialogs) {
          setGameResults(buildResultsSummary());
          setResultsOpen(true);
        }
        return true;
      }

      if (payload.type === 'engine_ack' || payload.type === 'user_turn' || payload.type === 'user_move_echo') {
        return false;
      }

      return false;
    },
    [buildResultsSummary, prefersReducedMotion],
  );

  const processLine = useCallback(
    (line: string) => {
      try {
        const payload = JSON.parse(line);
        return processPayload(payload);
      } catch {
        return false;
      }
    },
    [processPayload],
  );

  const startAutoStream = useCallback(async () => {
    if (!backendLiveAvailable) {
      setAutoError('Live stream is not available in this build. Use Replay.');
      return;
    }
    if (!token) {
      setAutoError('Missing authentication token.');
      return;
    }

    abortControllerRef.current?.abort();
    resetBoardState();
    setResultsOpen(false);
    setIsPlaying(true);
    setStatusMessage('Connecting to environment…');
    sawEndEventRef.current = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(streamChessAutoUrl(), {
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
      setStatusMessage('Streaming live session');

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
          if (flushBuffer()) {
            break;
          }
        }
        if (done) {
          buffer += decoder.decode();
          flushBuffer();
          break;
        }
      }
      if (!sawEndEventRef.current) {
        setStatusMessage('Stream ended unexpectedly');
        if (moveLogRef.current.length === 0) {
          setAutoError(
            'Live stream closed before any move events were emitted. Verify backend runtime dependencies or use the prepared replay.',
          );
        }
      }
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        setStatusMessage('Stream paused');
      } else if (error instanceof ApiError) {
        setAutoError(error.message);
        setStatusMessage('Stream error');
        if (error.status === 401) {
          onAuthFailure?.();
        }
      } else {
        const fallback =
          err.message?.includes('Failed to fetch')
            ? 'Unable to reach live stream endpoint. Check backend server and API base URL.'
            : err.message || 'Failed to stream environment.';
        setAutoError(fallback);
        setStatusMessage('Stream error');
      }
    } finally {
      setIsPlaying(false);
      abortControllerRef.current = null;
    }
  }, [backendLiveAvailable, onAuthFailure, processLine, resetBoardState, token]);

  const handleStopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPlaying(false);
    setSamplePlaybackPlaying(false);
    setStatusMessage('Stream paused');
  }, []);

  useEffect(() => {
    replayPayloadsRef.current = replayPayloads;
  }, [replayPayloads]);

  useEffect(() => {
    void loadManifest()
      .then((entries) => {
        setManifestEntries(entries);
        const chessEntries = entries.filter((entry) => entry.envType === 'chess');
        if (chessEntries.length === 0) return;
        setSelectedDatasetPath((prev) => prev ?? chessEntries[0].path);
      })
      .catch((err) => {
        setAutoError((err as Error).message || 'Failed to load experiment manifest.');
      });
  }, []);

  const loadChessSample = useCallback(async () => {
    if (!selectedDatasetPath) {
      throw new Error('No chess experiment selected.');
    }
    const dataset = await loadDataset(selectedDatasetPath);
    const payloads = datasetToChessReplayPayloads(dataset) as StreamPayload[];
    if (!Array.isArray(payloads) || payloads.length === 0) {
      throw new Error('Selected dataset does not contain replayable chess moves.');
    }
    setActiveDataset(dataset);
    setReplayPayloads(payloads);
    replayPayloadsRef.current = payloads;
    resetBoardState();
    setReplayCursor(-1);
    setResultsOpen(false);
    setAutoError(null);
    setSamplePlaybackPlaying(false);
    setStatusMessage('Experiment loaded — play, step, or adjust speed.');
  }, [resetBoardState, selectedDatasetPath]);

  /** Replay step index in `chessMovePayloads` only: -1 = before first move, else last applied move index. */
  const applyReplayUpToStep = useCallback(
    (stepIndex: number) => {
      const list = chessMovePayloadsRef.current;
      if (stepIndex < 0) {
        resetBoardState();
        setSamplePlaybackPlaying(false);
        setStatusMessage('Replay reset');
        return;
      }
      if (!list.length) return;
      resetBoardState();
      const max = Math.min(stepIndex, list.length - 1);
      for (let i = 0; i <= max; i += 1) {
        processPayload(list[i], { suppressDialogs: true });
      }
      setReplayCursor(max);
      setStatusMessage(max >= list.length - 1 ? 'Replay complete' : 'Sample replay');
    },
    [processPayload, resetBoardState],
  );

  const goReplayNext = useCallback(() => {
    const list = chessMovePayloadsRef.current;
    if (!list.length) return;
    const next = replayCursor + 1;
    if (next >= list.length) return;
    const payload = list[next];
    const stopped = processPayload(payload, { suppressDialogs: true });
    setReplayCursor(next);
    if (stopped) setSamplePlaybackPlaying(false);
  }, [replayCursor, processPayload]);

  const goReplayPrev = useCallback(() => {
    if (replayCursor <= -1) return;
    applyReplayUpToStep(replayCursor - 1);
  }, [replayCursor, applyReplayUpToStep]);

  useEffect(() => {
    if (!samplePlaybackPlaying || dataSource !== 'sample') return;
    const list = chessMovePayloadsRef.current;
    if (!list.length) return;
    if (replayCursor >= list.length - 1) {
      setSamplePlaybackPlaying(false);
      return;
    }
    const base = 400;
    const delay = Math.max(50, base / playbackSpeed);
    const id = window.setTimeout(() => {
      goReplayNext();
    }, delay);
    return () => clearTimeout(id);
  }, [samplePlaybackPlaying, replayCursor, playbackSpeed, dataSource, goReplayNext]);

  const handlePlaybackPlay = useCallback(async () => {
    if (dataSource === 'live') {
      void startAutoStream();
      return;
    }
    if (!replayPayloadsRef.current.length) {
      try {
        await loadChessSample();
      } catch (err) {
        setAutoError((err as Error).message || 'Failed to load sample results.');
        setStatusMessage('Sample error');
        return;
      }
    }
    setSamplePlaybackPlaying(true);
  }, [dataSource, loadChessSample, startAutoStream]);

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
      resetBoardState();
      setResultsOpen(false);
      return;
    }
    setSamplePlaybackPlaying(false);
    applyReplayUpToStep(-1);
  }, [dataSource, handleStopStream, resetBoardState, applyReplayUpToStep]);

  const handleResetBoard = useCallback(() => {
    handleStopStream();
    resetBoardState();
    setSamplePlaybackPlaying(false);
    setResultsOpen(false);
  }, [handleStopStream, resetBoardState]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (animTimeoutRef.current) {
        clearTimeout(animTimeoutRef.current);
        animTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (dataSource !== 'sample') return;
    if (!selectedDatasetPath) return;
    void loadChessSample().catch((err) => {
      setAutoError((err as Error).message || 'Failed to load sample');
      setStatusMessage('Sample error');
    });
  }, [dataSource, loadChessSample, selectedDatasetPath]);

  useEffect(() => {
    if (backendLiveAvailable || dataSource !== 'live') return;
    onSetDataSource?.('sample');
  }, [backendLiveAvailable, dataSource, onSetDataSource]);

  /** Keep the active move row in view inside the log scroll area only (does not scroll the page). */
  useEffect(() => {
    const container = moveLogScrollRef.current;
    const el = activeMoveLogItemRef.current;
    if (!container || !el) return;
    const id = requestAnimationFrame(() => {
      scrollChildIntoContainer(container, el, {
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        padding: 10,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [replayCursor, moveLogEntries.length, prefersReducedMotion]);

  const averageLatencyMs = useMemo(() => {
    const entries = moveLogEntries.filter((entry) => typeof entry.latencyMs === 'number');
    if (entries.length === 0) return null;
    return Math.round(entries.reduce((sum, entry) => sum + (entry.latencyMs ?? 0), 0) / entries.length);
  }, [moveLogEntries]);

  /** Change in eval vs previous position (prefers engine-reported swing, else Δ totals). */
  const evalDeltaCp = useMemo(() => {
    if (moveLogEntries.length === 0) return null;
    const last = moveLogEntries[moveLogEntries.length - 1];
    if (typeof last.centipawnsCurrent === 'number') return last.centipawnsCurrent;
    if (moveLogEntries.length >= 2) {
      const prev = moveLogEntries[moveLogEntries.length - 2];
      const a = last.centipawnsTotal;
      const b = prev.centipawnsTotal;
      if (typeof a === 'number' && typeof b === 'number') return a - b;
    }
    return null;
  }, [moveLogEntries]);

  const material = useMemo(() => materialAdvantageFromGame(chessRef.current), [moveLogEntries.length]);

  const handleSwitchToLive = useCallback(() => {
    handleStopStream();
    setReplayPayloads([]);
    replayPayloadsRef.current = [];
    resetBoardState();
    setResultsOpen(false);
    onSetDataSource?.('live');
  }, [handleStopStream, onSetDataSource, resetBoardState]);

  const handleSwitchToSample = useCallback(() => {
    handleStopStream();
    resetBoardState();
    setResultsOpen(false);
    onSetDataSource?.('sample');
  }, [handleStopStream, onSetDataSource, resetBoardState]);

  const handleRematch = useCallback(() => {
    setResultsOpen(false);
    if (dataSource === 'sample') {
      setSamplePlaybackPlaying(false);
      void loadChessSample();
      return;
    }
    void startAutoStream();
  }, [dataSource, loadChessSample, startAutoStream]);

  const playbackActive = dataSource === 'sample' ? samplePlaybackPlaying : isPlaying;
  const chessMovesTotal = chessMovePayloads.length;
  const replayPositionLabel =
    dataSource === 'sample' && chessMovesTotal > 0
      ? replayCursor < 0
        ? `0 / ${chessMovesTotal}`
        : `${replayCursor + 1} / ${chessMovesTotal}`
      : dataSource === 'live'
        ? 'Live stream'
        : '—';
  const canReplayPrev = dataSource === 'sample' && replayCursor >= 0;
  const canReplayNext = dataSource === 'sample' && chessMovesTotal > 0 && replayCursor < chessMovesTotal - 1;

  const handlePlaybackSeek = useCallback(
    (idx: number) => {
      setSamplePlaybackPlaying(false);
      applyReplayUpToStep(idx);
    },
    [applyReplayUpToStep],
  );

  const seekEnabled = dataSource === 'sample' && chessMovesTotal > 0;

  const movesMetricValue = useMemo(() => {
    if (dataSource === 'sample' && chessMovesTotal > 0) {
      return `${moveLogEntries.length} / ${chessMovesTotal}`;
    }
    return moveLogEntries.length;
  }, [dataSource, chessMovesTotal, moveLogEntries.length]);

  const chessMetricsItems = useMemo(
    () => [
      { key: 'status', label: 'Status', value: statusMessage },
      { key: 'moves', label: 'Moves', value: movesMetricValue },
      { key: 'last', label: 'Last', value: latestMove?.san ?? '—' },
      {
        key: 'latency',
        label: 'Avg latency',
        value: typeof averageLatencyMs === 'number' ? `${averageLatencyMs} ms` : '—',
        mutedSuffix: <span className="text-muted-foreground"> ({INFERRED_NOTE})</span>,
      },
    ],
    [averageLatencyMs, latestMove?.san, movesMetricValue, statusMessage],
  );

  return (
    <>
      <SandboxVisualizationRoot>
        <SandboxEnvironmentHeader
          onBack={onBack}
          title={environmentLabel}
          contextBadge={<Badge variant="secondary">Workspace</Badge>}
          dataSource={dataSource}
          playbackActive={playbackActive}
          errorMessage={autoError}
          backendLiveAvailable={backendLiveAvailable}
          onSwitchToSample={handleSwitchToSample}
          onSwitchToLive={handleSwitchToLive}
          subtitle={
            backendLiveAvailable
              ? 'Replay uses experiment JSON datasets; live stream uses the environment API.'
              : 'Standalone build: replay uses experiment JSON datasets only. Connect a CrewForge API server to enable live streams.'
          }
          metricsStrip={
            <>
              <SandboxMetricsStrip items={chessMetricsItems} />
              <div className="mt-2.5">
                <ExperimentPicker
                  entries={manifestEntries}
                  envType="chess"
                  selectedPath={selectedDatasetPath}
                  onSelectPath={setSelectedDatasetPath}
                />
              </div>
            </>
          }
        />

        <div className="p-3 sm:p-4">
          <div
            className={`sandbox-main-grid sandbox-main-grid--with-graph${wideSidePanel ? ' sandbox-main-grid--side-focus' : ''}`}
          >
            <motion.div layout className="min-w-0" transition={sandboxSplitLayoutTransition}>
              <SandboxPrimaryCard
                  title="Board & analysis"
                  description="UCI stream · chess.js SAN · eval from centipawns"
                  toolbar={
                    <SandboxVizToolbarBlock
                      dataSource={dataSource}
                      playbackActive={playbackActive}
                      errorMessage={autoError}
                      onFullReset={handleResetBoard}
                      playbackControls={
                        <SandboxPlaybackControls
                          isLive={dataSource === 'live'}
                          isPlaying={playbackActive}
                          onPlay={() => void handlePlaybackPlay()}
                          onPause={handlePlaybackPause}
                          onRestart={handlePlaybackRestart}
                          onPrev={goReplayPrev}
                          onNext={goReplayNext}
                          canPrev={canReplayPrev}
                          canNext={canReplayNext}
                          speed={playbackSpeed}
                          onSpeedChange={setPlaybackSpeed}
                          positionLabel={replayPositionLabel}
                          disabled={!!autoError}
                          hideStepControls={dataSource === 'live'}
                          seekMin={seekEnabled ? -1 : 0}
                          seekMax={seekEnabled ? chessMovesTotal - 1 : 0}
                          seekValue={replayCursor}
                          onSeekChange={seekEnabled ? handlePlaybackSeek : undefined}
                          seekLabel="Move"
                        />
                      }
                    />
                  }
                >
                  <div className="sandbox-chess-compact chess-board-workspace">
                    <ChessMaterial
                      whiteIcons={material.whiteIcons}
                      blackIcons={material.blackIcons}
                      whitePlus={material.whitePlus}
                      blackPlus={material.blackPlus}
                    >
                      <div className="chess-board-and-eval">
                        <ChessEvalBar
                          centipawnsTotal={latestMove?.centipawnsTotal ?? null}
                          evalDeltaCp={evalDeltaCp}
                          moveKey={moveLogEntries.length}
                        />
                        <motion.div
                          className="chess-board-and-eval__board"
                          key={moveLogEntries.length}
                          initial={{ opacity: 0.9, scale: 0.992 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChessBoard board={board} moveAnim={moveAnim} />
                        </motion.div>
                      </div>
                    </ChessMaterial>
                    <ChessMoveList
                      className="chess-movelist--clamped"
                      entries={moveLogEntries.map((e) => ({
                        ply: e.ply,
                        san: e.san,
                        uci: e.uci,
                        player: e.player,
                      }))}
                    />
                  </div>
                </SandboxPrimaryCard>
            </motion.div>

            <motion.aside layout className="min-w-0 flex flex-col gap-3" transition={sandboxSplitLayoutTransition}>
              <SandboxSidePanelHeader expanded={wideSidePanel} onToggle={() => setWideSidePanel((v) => !v)} />
              <div className="sandbox-side-stack min-w-0">
              <InteractionGraphSection
                dataset={activeDataset}
                layout="sideColumn"
                evidenceFocusTurn={
                  activeDataset && replayCursor >= 0 ? turnAtChessReplayStep(activeDataset, replayCursor) : null
                }
              />
              <SandboxSideLogCard
                title="Move log"
                subtitle="Moves, eval, and timing"
                entryCount={chessMovesTotal > 0 ? chessMovesTotal : moveLogEntries.length}
              >
                <div ref={moveLogScrollRef} className="sandbox-move-log-scroll">
                  {moveLogEntries.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                      No moves yet. Start a live stream or replay the loaded experiment.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {moveLogEntries.map((entry, idx) => (
                        <div
                          key={`${entry.ply}-${entry.uci}-${idx}`}
                          ref={idx === moveLogEntries.length - 1 ? activeMoveLogItemRef : undefined}
                          className="sandbox-move-item"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="sandbox-move-uci">
                                {entry.ply + 1}. {entry.san}{' '}
                                <span className="font-normal text-muted-foreground">({entry.uci.toUpperCase()})</span>
                              </div>
                              <Badge variant="secondary">{entry.player}</Badge>
                            </div>
                            <div className="sandbox-move-meta mt-1.5">
                              <span>eval {formatEvalPawns(entry.centipawnsTotal)}</span>
                              <span>Δ {formatCentipawnDelta(entry.centipawnsCurrent)}</span>
                              <span>latency {typeof entry.latencyMs === 'number' ? `${entry.latencyMs} ms` : '—'}</span>
                            </div>
                            {entry.reasoning && <p className="sandbox-reasoning">{entry.reasoning}</p>}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </SandboxSideLogCard>
              </div>
            </motion.aside>
          </div>
        </div>
      </SandboxVisualizationRoot>

      <GameResultsDialog
        open={resultsOpen && gameResults !== null}
        onClose={() => setResultsOpen(false)}
        onRematch={handleRematch}
        results={gameResults}
        mode={mode}
      />
    </>
  );
}
