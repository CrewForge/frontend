import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ChessBoard, BoardState, type BoardMoveAnimation } from './ChessBoard';
import { GameResultsDialog } from './GameResultsDialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
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

export interface ChessSandboxPageProps {
  token: string;
  onBack: () => void;
  dataSource?: 'live' | 'sample';
  onSetDataSource?: (source: 'live' | 'sample') => void;
  /** Clears session when stream returns 401 (expired / invalid token). */
  onAuthFailure?: () => void;
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

export function ChessSandboxPage({ token, onBack, dataSource = 'sample', onSetDataSource, onAuthFailure }: ChessSandboxPageProps) {
  const mode: 'user' | 'stockfish' = 'stockfish';
  const environmentLabel = 'Strategy Workspace';
  const [isPlaying, setIsPlaying] = useState(false);
  const [board, setBoard] = useState<BoardState>(createInitialBoard());
  const [resultsOpen, setResultsOpen] = useState(false);
  const [gameResults, setGameResults] = useState<GameResultsSummary | null>(null);
  const [moveCount, setMoveCount] = useState(0);
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

  const resetBoardState = useCallback(() => {
    if (animTimeoutRef.current) {
      clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = null;
    }
    setMoveAnim(null);
    chessRef.current = new Chess();
    setBoard(buildBoardState(chessRef.current, null));
    setMoveCount(0);
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
            setBoard(buildBoardState(beforeGame, null));
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
            animTimeoutRef.current = window.setTimeout(() => {
              setBoard(buildBoardState(chessRef.current, lastHighlight));
              setMoveAnim(null);
              animTimeoutRef.current = null;
            }, 460);
          } else {
            setMoveAnim(null);
            setBoard(buildBoardState(chessRef.current, lastHighlight));
          }

          setMoveCount((prev) => prev + 1);
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
            const next = [
              ...prev.slice(-49),
              nextEntry,
            ];
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
  }, [onAuthFailure, processLine, resetBoardState, token]);

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

  const loadChessSample = useCallback(async () => {
    const response = await fetch('/samples/chess-auto-sample.json');
    if (!response.ok) {
      throw new Error('Unable to load sample results.');
    }
    const payloads = (await response.json()) as StreamPayload[];
    if (!Array.isArray(payloads)) {
      throw new Error('Sample results are not in the expected array format.');
    }
    setReplayPayloads(payloads);
    replayPayloadsRef.current = payloads;
    resetBoardState();
    setReplayCursor(-1);
    setResultsOpen(false);
    setAutoError(null);
    setSamplePlaybackPlaying(false);
    setStatusMessage('Sample loaded — play, step, or adjust speed.');
  }, [resetBoardState]);

  const applyReplayUpTo = useCallback(
    (endIndex: number) => {
      const list = replayPayloadsRef.current;
      if (endIndex < 0) {
        resetBoardState();
        setSamplePlaybackPlaying(false);
        setStatusMessage('Replay reset');
        return;
      }
      if (!list.length) return;
      resetBoardState();
      const max = Math.min(endIndex, list.length - 1);
      for (let i = 0; i <= max; i += 1) {
        processPayload(list[i], { suppressDialogs: true });
      }
      setReplayCursor(max);
      setStatusMessage(max >= list.length - 1 ? 'Replay complete' : 'Sample replay');
    },
    [processPayload, resetBoardState],
  );

  const goReplayNext = useCallback(() => {
    const list = replayPayloadsRef.current;
    if (!list.length) return;
    const next = replayCursor + 1;
    if (next >= list.length) return;
    const payload = list[next];
    const suppress = payload.type !== 'end';
    const stopped = processPayload(payload, { suppressDialogs: suppress });
    setReplayCursor(next);
    if (stopped) setSamplePlaybackPlaying(false);
  }, [replayCursor, processPayload]);

  const goReplayPrev = useCallback(() => {
    if (replayCursor <= -1) return;
    applyReplayUpTo(replayCursor - 1);
  }, [replayCursor, applyReplayUpTo]);

  useEffect(() => {
    if (!samplePlaybackPlaying || dataSource !== 'sample') return;
    const list = replayPayloadsRef.current;
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
    applyReplayUpTo(-1);
  }, [dataSource, handleStopStream, resetBoardState, applyReplayUpTo]);

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
    void loadChessSample().catch((err) => {
      setAutoError((err as Error).message || 'Failed to load sample');
      setStatusMessage('Sample error');
    });
  }, [dataSource, loadChessSample]);

  /** Keep move log pinned to the latest entry (bottom) as new moves stream in. */
  useEffect(() => {
    const el = moveLogScrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });
    return () => cancelAnimationFrame(id);
  }, [moveLogEntries.length, prefersReducedMotion]);

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

  const material = useMemo(() => materialAdvantageFromGame(chessRef.current), [moveCount]);

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
  const replayPositionLabel =
    dataSource === 'sample' && replayPayloads.length > 0
      ? `${replayCursor + 1} / ${replayPayloads.length}`
      : dataSource === 'live'
        ? 'Live stream'
        : '—';
  const canReplayPrev = dataSource === 'sample' && replayCursor >= 0;
  const canReplayNext =
    dataSource === 'sample' && replayPayloads.length > 0 && replayCursor < replayPayloads.length - 1;

  const handlePlaybackSeek = useCallback(
    (idx: number) => {
      setSamplePlaybackPlaying(false);
      applyReplayUpTo(idx);
    },
    [applyReplayUpTo],
  );

  const seekEnabled = dataSource === 'sample' && replayPayloads.length > 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef2ff_0%,#ffffff_40%)]">
      <div className="sandbox-shell flex min-h-screen flex-col px-3 py-2 sm:px-4 sm:py-3 lg:px-5">
        <div className="rounded-2xl border bg-card/95 shadow-sm backdrop-blur">
          <div className="border-b px-3 py-2.5 sm:px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <Button variant="outline" size="sm" onClick={onBack} className="shrink-0">
                ← Back
              </Button>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{environmentLabel}</h1>
              <Badge variant="secondary">Workspace</Badge>
              <Badge variant="outline">{dataSource === 'live' ? 'Live' : 'Replay'}</Badge>
              <Badge variant={autoError ? 'destructive' : playbackActive ? 'default' : 'secondary'}>
                {autoError ? 'Error' : playbackActive ? 'Playing' : 'Ready'}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sample replay uses bundled JSON; live stream uses the environment API.
            </p>

            <div className="sandbox-metrics-strip mt-2.5">
              <span>
                <span className="sandbox-metrics-strip__k">Status</span> {statusMessage}
              </span>
              <span className="sandbox-metrics-strip__sep" aria-hidden>
                ·
              </span>
              <span>
                <span className="sandbox-metrics-strip__k">Moves</span> {moveCount}
              </span>
              <span className="sandbox-metrics-strip__sep" aria-hidden>
                ·
              </span>
              <span>
                <span className="sandbox-metrics-strip__k">Last</span> {latestMove?.san ?? '—'}
              </span>
              <span className="sandbox-metrics-strip__sep" aria-hidden>
                ·
              </span>
              <span>
                <span className="sandbox-metrics-strip__k">Avg latency</span>{' '}
                {typeof averageLatencyMs === 'number' ? `${averageLatencyMs} ms` : '—'}{' '}
                <span className="text-muted-foreground">({INFERRED_NOTE})</span>
              </span>
            </div>
            {autoError && (
              <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs text-destructive sm:text-sm">
                {autoError}
              </div>
            )}
          </div>

          <div className="sandbox-main-grid p-3 sm:p-4">
            <div className="min-w-0">
              <Card className="min-w-0 overflow-hidden">
                <div className="border-b px-3 py-2 sm:px-4">
                  <h3 className="text-sm font-semibold sm:text-base">Board &amp; analysis</h3>
                  <p className="text-xs text-muted-foreground">
                    UCI stream · chess.js SAN · eval from centipawns
                  </p>
                </div>
                <div className="min-w-0 px-3 pb-2.5 pt-2 sm:px-4 sm:pb-3 sm:pt-2.5">
                  <div className="sandbox-viz-toolbar">
                    <div className="sandbox-viz-toolbar__badges">
                      <Badge variant="outline">{dataSource === 'live' ? 'Live stream' : 'Prepared replay'}</Badge>
                      <Badge variant={autoError ? 'destructive' : playbackActive ? 'default' : 'secondary'}>
                        {autoError ? 'Error' : playbackActive ? 'Playing' : 'Ready'}
                      </Badge>
                    </div>
                    <div className="sandbox-viz-toolbar__playback-row">
                      <div className="sandbox-viz-toolbar__playback-wrap">
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
                          seekMax={seekEnabled ? replayPayloads.length - 1 : 0}
                          seekValue={replayCursor}
                          onSeekChange={seekEnabled ? handlePlaybackSeek : undefined}
                          seekLabel="Move"
                        />
                      </div>
                      <div className="sandbox-viz-toolbar__actions">
                        <Button variant="outline" size="sm" onClick={handleResetBoard}>
                          Full reset
                        </Button>
                      </div>
                    </div>
                  </div>
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
                          moveKey={moveCount}
                        />
                        <motion.div
                          className="chess-board-and-eval__board"
                          key={moveCount}
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
                </div>
              </Card>
            </div>

            <div className="min-w-0">
              <Card className="sandbox-move-log sandbox-log-panel gap-0 p-3">
                <div className="sandbox-move-log__header mb-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="sandbox-log-title">Move log</h3>
                    <p className="sandbox-log-subtitle">Moves, eval, and reasoning</p>
                  </div>
                  <Badge variant="outline">{moveLogEntries.length} entries</Badge>
                </div>
                <div ref={moveLogScrollRef} className="sandbox-move-log-scroll">
                  {moveLogEntries.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                      No moves yet. Start a live stream or replay the sample run.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {moveLogEntries.map((entry, idx) => (
                        <div key={`${entry.ply}-${entry.uci}-${idx}`} className="sandbox-move-item">
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
              </Card>
            </div>
          </div>
        </div>
      </div>

      <GameResultsDialog
        open={resultsOpen && gameResults !== null}
        onClose={() => setResultsOpen(false)}
        onRematch={handleRematch}
        results={gameResults}
        mode={mode}
      />
    </div>
  );
}
