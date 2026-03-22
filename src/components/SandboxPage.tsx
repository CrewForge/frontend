import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ChessBoard, BoardState } from './ChessBoard';
import { AgentFlowChart } from './AgentFlowChart';
import { GameResultsDialog } from './GameResultsDialog';
import { Agent } from './AgentCard';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { Chess } from 'chess.js';
import { ApiError, authHeaders, streamChessAutoUrl, throwIfResponseNotOk } from '../lib/api';
import type { GameResultsSummary } from './GameResultsDialog';

interface SandboxPageProps {
  environment: string;
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

function formatCentipawns(value?: number) {
  if (typeof value !== 'number') return '—';
  return `${value > 0 ? '+' : ''}${value}`;
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

// Agent data
const agents: Agent[] = [
  {
    id: 'meta',
    name: 'Orchestrator',
    role: 'Meta-Agent',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NjIyMDM1MDl8MA&ixlib=rb-4.1.0&q=80&w=200',
    color: '#6366f1',
    status: 'online',
    confidence: 98,
    lastAction: 'Coordinating team strategy',
    movesCount: 0,
    isMetaAgent: true
  },
  {
    id: 'ava',
    name: 'Ava',
    role: 'Strategist',
    avatar: 'https://images.unsplash.com/photo-1701463387028-3947648f1337?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBhdmF0YXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjIyMDM1NTV8MA&ixlib=rb-4.1.0&q=80&w=200',
    color: '#14b8a6',
    status: 'online',
    confidence: 92,
    lastAction: 'Analyzing board position',
    movesCount: 0
  },
  {
    id: 'ravi',
    name: 'Ravi',
    role: 'Tactician',
    avatar: 'https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjIyNjE3MTh8MA&ixlib=rb-4.1.0&q=80&w=200',
    color: '#a855f7',
    status: 'online',
    confidence: 88,
    lastAction: 'Calculating tactics',
    movesCount: 0
  },
  {
    id: 'elena',
    name: 'Elena',
    role: 'Analyst',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHdvbWFuJTIwaGVhZHNob3R8ZW58MXx8fHwxNzYyMjU4NDE1fDA&ixlib=rb-4.1.0&q=80&w=200',
    color: '#3b82f6',
    status: 'online',
    confidence: 95,
    lastAction: 'Evaluating position',
    movesCount: 0
  },
  {
    id: 'kai',
    name: 'Kai',
    role: 'Defender',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW4lMjBwb3J0cmFpdCUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3MzA4NTA2Mzl8MA&ixlib=rb-4.1.0&q=80&w=200',
    color: '#ef4444',
    status: 'online',
    confidence: 91,
    lastAction: 'Defending king safety',
    movesCount: 0
  }
];

const pieceTypeMap: Record<string, 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn'> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

const buildBoardState = (game: Chess, lastMove?: string | null): BoardState => {
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

  if (lastMove && lastMove.length >= 4) {
    const squares = [lastMove.slice(0, 2), lastMove.slice(2, 4)];
    squares.forEach((coord) => {
      const file = coord.charCodeAt(0) - 97;
      const rank = 8 - Number(coord[1]);
      if (boardState[rank]?.[file]) {
        boardState[rank][file] = {
          ...boardState[rank][file],
          highlight: 'lastMove',
        };
      }
    });
  }

  return boardState;
};

const createInitialBoard = () => buildBoardState(new Chess());

export function SandboxPage({ environment, token, onBack, dataSource = 'live', onSetDataSource, onAuthFailure }: SandboxPageProps) {
  const mode: 'user' | 'stockfish' = 'stockfish';
  const environmentLabel = environment === 'chess' ? 'Strategy Workspace' : environment;
  const [isPlaying, setIsPlaying] = useState(false);
  const [board, setBoard] = useState<BoardState>(createInitialBoard());
  const [resultsOpen, setResultsOpen] = useState(false);
  const [gameResults, setGameResults] = useState<GameResultsSummary | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [moveLogEntries, setMoveLogEntries] = useState<MoveLogEntry[]>([]);
  const moveLogRef = useRef<MoveLogEntry[]>([]);
  const [latestMove, setLatestMove] = useState<MoveLogEntry | null>(null);
  const [systemLog, setSystemLog] = useState<string[]>([]);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Awaiting start');
  const abortControllerRef = useRef<AbortController | null>(null);
  const chessRef = useRef(new Chess());
  const streamStartedAtRef = useRef<number | null>(null);
  const sawEndEventRef = useRef(false);
  const autoStartedSampleRef = useRef(false);
  const [showFlowChart, setShowFlowChart] = useState(false);
  const [showMoveLog, setShowMoveLog] = useState(true);
  const [showBackendLog, setShowBackendLog] = useState(false);
  
  // Flow chart data
  const [flowNodes, setFlowNodes] = useState([
    {
      id: 'meta',
      agent: agents[0],
      position: { x: 250, y: 50 },
      status: 'idle' as const,
      currentThought: 'Initializing team coordination...'
    },
    {
      id: 'ava',
      agent: agents[1],
      position: { x: 50, y: 200 },
      status: 'idle' as const,
      currentThought: 'Ready to analyze strategic positions'
    },
    {
      id: 'ravi',
      agent: agents[2],
      position: { x: 250, y: 200 },
      status: 'idle' as const,
      currentThought: 'Standing by for tactical calculations'
    },
    {
      id: 'elena',
      agent: agents[3],
      position: { x: 450, y: 200 },
      status: 'idle' as const,
      currentThought: 'Prepared to evaluate positions'
    },
    {
      id: 'kai',
      agent: agents[4],
      position: { x: 150, y: 350 },
      status: 'idle' as const,
      currentThought: 'Monitoring defensive considerations'
    }
  ]);

  const [flowConnections, setFlowConnections] = useState([
    { from: 'meta', to: 'ava', label: 'Strategy', active: false },
    { from: 'meta', to: 'ravi', label: 'Tactics', active: false },
    { from: 'meta', to: 'elena', label: 'Analysis', active: false },
    { from: 'ava', to: 'kai', label: 'Defense', active: false },
    { from: 'ravi', to: 'kai', label: 'Protect', active: false },
  ]);

  const resetBoardState = useCallback(() => {
    chessRef.current = new Chess();
    setBoard(buildBoardState(chessRef.current));
    setMoveCount(0);
    moveLogRef.current = [];
    setMoveLogEntries([]);
    setLatestMove(null);
    setSystemLog([]);
    setAutoError(null);
    setStatusMessage('Awaiting start');
    setGameResults(null);
    streamStartedAtRef.current = null;
    sawEndEventRef.current = false;
    setFlowNodes(nodes => nodes.map(node => ({
      ...node,
      status: 'idle',
      currentThought: node.agent.isMetaAgent
        ? 'Initializing team coordination...'
        : 'Ready to assist',
    })));
    setFlowConnections(conns => conns.map(conn => ({ ...conn, active: false })));
  }, []);

  const appendSystemLog = useCallback((entry: string) => {
    setSystemLog((prev) => [entry, ...prev].slice(0, 60));
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
        return `Move ${entry.ply + 1} (${entry.uci.toUpperCase()}): ${entry.reasoning} Eval swing ${swing}.`;
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
    (payload: StreamPayload) => {
      if (!payload || typeof payload !== 'object') {
        appendSystemLog('Received unknown payload');
        return false;
      }

      if (payload.type === 'event' && payload.uci) {
        try {
          chessRef.current.move(payload.uci, { sloppy: true });
          setBoard(buildBoardState(chessRef.current, payload.uci));
          setMoveCount((prev) => prev + 1);
          const nextEntry: MoveLogEntry = {
            ply: typeof payload.ply === 'number' ? payload.ply : moveLogRef.current.length,
            uci: payload.uci,
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
          setFlowNodes((nodes) =>
            nodes.map((node, idx) => ({
              ...node,
              status: idx === 0 ? 'thinking' : 'idle',
              currentThought:
                idx === 0
                  ? `Analyzing ${payload.uci.toUpperCase()}`
                  : node.currentThought,
            })),
          );
          setFlowConnections((connections) =>
            connections.map((conn, idx) => ({
              ...conn,
              active:
                connections.length === 0
                  ? false
                  : idx === ((typeof payload.ply === 'number' ? payload.ply : 0) % connections.length),
            })),
          );
          setStatusMessage(`Last move: ${payload.uci.toUpperCase()} (${payload.player || 'agent'})`);
        } catch (err) {
          appendSystemLog(`Invalid move received: ${payload.uci}`);
        }
        return false;
      }

      if (payload.type === 'log') {
        appendSystemLog(payload.message || 'Log event');
        return false;
      }

      if (payload.type === 'end') {
        sawEndEventRef.current = true;
        setStatusMessage('Environment complete');
        setGameResults(buildResultsSummary());
        setResultsOpen(true);
        return true;
      }

      if (payload.type === 'engine_ack' || payload.type === 'user_turn' || payload.type === 'user_move_echo') {
        appendSystemLog(`Control event: ${payload.type}`);
        return false;
      }

      appendSystemLog(JSON.stringify(payload));
      return false;
    },
    [appendSystemLog, buildResultsSummary],
  );

  const processLine = useCallback(
    (line: string) => {
      try {
        const payload = JSON.parse(line);
        return processPayload(payload);
      } catch (err) {
        appendSystemLog(line);
        return false;
      }
    },
    [appendSystemLog, processPayload],
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
      setFlowNodes(nodes => nodes.map((node, idx) => ({
        ...node,
        status: idx === 0 ? 'active' : 'idle',
        currentThought: idx === 0 ? 'Coordinating live session' : node.currentThought,
      })));

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
        appendSystemLog('Stream aborted.');
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
  }, [appendSystemLog, onAuthFailure, processLine, resetBoardState, token]);

  const startSampleReplay = useCallback(async () => {
    abortControllerRef.current?.abort();
    resetBoardState();
    setResultsOpen(false);
    setIsPlaying(true);
    setStatusMessage('Loading sample results…');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/samples/chess-auto-sample.json', { signal: controller.signal });
      if (!response.ok) {
        throw new Error('Unable to load sample results.');
      }

      const payloads = (await response.json()) as StreamPayload[];
      if (!Array.isArray(payloads)) {
        throw new Error('Sample results are not in the expected array format.');
      }

      streamStartedAtRef.current = Date.now();
      setStatusMessage('Replaying sample results');

      for (const payload of payloads) {
        if (controller.signal.aborted) {
          throw new DOMException('The operation was aborted.', 'AbortError');
        }
        const shouldStop = processPayload(payload);
        if (shouldStop) {
          break;
        }
        await waitWithAbort(payload.type === 'event' ? 420 : 180, controller.signal);
      }
      if (!sawEndEventRef.current) {
        setStatusMessage('Sample complete (no explicit end event)');
        setGameResults(buildResultsSummary());
        setResultsOpen(true);
      }
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        appendSystemLog('Replay stopped.');
        setStatusMessage('Replay paused');
      } else {
        setAutoError(err.message || 'Failed to load sample results.');
        setStatusMessage('Sample error');
      }
    } finally {
      setIsPlaying(false);
      abortControllerRef.current = null;
    }
  }, [appendSystemLog, buildResultsSummary, processPayload, resetBoardState]);

  const handleStopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPlaying(false);
    setStatusMessage('Stream paused');
  }, []);

  const handleResetBoard = useCallback(() => {
    handleStopStream();
    resetBoardState();
    setResultsOpen(false);
    setShowMoveLog(true);
    setShowBackendLog(false);
  }, [handleStopStream, resetBoardState]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
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

  const averageLatencyMs = useMemo(() => {
    const entries = moveLogEntries.filter((entry) => typeof entry.latencyMs === 'number');
    if (entries.length === 0) return null;
    return Math.round(entries.reduce((sum, entry) => sum + (entry.latencyMs ?? 0), 0) / entries.length);
  }, [moveLogEntries]);

  const handleStartGame = useCallback(() => {
    if (dataSource === 'sample') {
      void startSampleReplay();
      return;
    }
    void startAutoStream();
  }, [dataSource, startAutoStream, startSampleReplay]);

  const handleStartSample = useCallback(() => {
    void startSampleReplay();
  }, [startSampleReplay]);

  const handleSwitchToLive = useCallback(() => {
    handleStopStream();
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
      void startSampleReplay();
      return;
    }
    void startAutoStream();
  }, [dataSource, startAutoStream, startSampleReplay]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef2ff_0%,#ffffff_40%)]">
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
                  <Badge variant="secondary">Workspace view</Badge>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Session state and metrics are reconstructed directly from backend JSON events.
                </p>
              </div>

              <div className="sandbox-controls-panel">
                <div className="sandbox-controls-top">
                  <Badge variant="outline">{dataSource === 'sample' ? 'Prepared replay' : 'Live backend stream'}</Badge>
                  <Badge variant={autoError ? 'destructive' : isPlaying ? 'default' : 'secondary'}>{autoError ? 'Error' : isPlaying ? 'Running' : 'Ready'}</Badge>
                </div>
                <div className="sandbox-controls-actions">
                  {!isPlaying ? (
                    <Button
                      onClick={handleStartGame}
                      disabled={dataSource === 'live' && !token}
                      className="min-w-[10rem] font-medium"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {dataSource === 'sample' ? 'Replay prepared run' : 'Start live stream'}
                    </Button>
                  ) : (
                    <Button onClick={handleStopStream} variant="outline" className="min-w-[10rem] font-medium">
                      <Pause className="mr-2 h-4 w-4" />
                      Stop
                    </Button>
                  )}
                  {dataSource === 'live' && !isPlaying && (
                    <Button variant="outline" onClick={handleStartSample}>
                      Open prepared replay
                    </Button>
                  )}
                  {dataSource === 'sample' && token && !isPlaying && (
                    <Button variant="outline" onClick={handleSwitchToLive}>
                      Connect live source
                    </Button>
                  )}
                  {dataSource === 'live' && !isPlaying && (
                    <Button variant="ghost" onClick={handleSwitchToSample}>
                      Use prepared replay
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleResetBoard} aria-label="Reset board">
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
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground">Moves parsed</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">{moveCount}</div>
              </Card>
              <Card className="p-3">
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground">Last move</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">{latestMove?.uci?.toUpperCase() ?? '—'}</div>
              </Card>
              <Card className="p-3">
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground">Average latency</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">
                  {typeof averageLatencyMs === 'number' ? `${averageLatencyMs} ms` : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground">{INFERRED_NOTE}</div>
              </Card>
            </div>
            {autoError && <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{autoError}</div>}
          </div>

          <div className="sandbox-main-grid p-4 sm:p-6">
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <div className="border-b px-4 py-3">
                  <h3 className="text-base font-semibold">Board state</h3>
                  <p className="text-sm text-muted-foreground">Reconstructed from streamed move events</p>
                </div>
                <div className="flex justify-center p-4 sm:p-6">
                  <motion.div
                    key={moveCount}
                    initial={{ opacity: 0.88, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChessBoard board={board} />
                  </motion.div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Eval total</div>
                  <div className="mt-1 text-lg font-semibold">{formatCentipawns(latestMove?.centipawnsTotal)}</div>
                  <div className="text-xs text-muted-foreground">from latest event payload</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Eval swing</div>
                  <div className="mt-1 text-lg font-semibold">{formatCentipawns(latestMove?.centipawnsCurrent)}</div>
                  <div className="text-xs text-muted-foreground">delta from latest event payload</div>
                </Card>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="sandbox-log-panel p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="sandbox-log-title">Move log</h3>
                    <p className="sandbox-log-subtitle">Backend move events and reasoning</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{moveLogEntries.length} entries</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setShowMoveLog((value) => !value)}>
                      {showMoveLog ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>
                {showMoveLog ? (
                  <div className="max-h-[20rem] space-y-3 overflow-auto pr-1">
                    {moveLogEntries.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No moves yet. Start a live stream or replay the sample run.
                      </div>
                    ) : (
                      moveLogEntries.map((entry, idx) => (
                        <div key={`${entry.ply}-${entry.uci}-${idx}`} className="sandbox-move-item">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="sandbox-move-uci">
                              {entry.ply + 1}. {entry.uci.toUpperCase()}
                            </div>
                            <Badge variant="secondary">{entry.player}</Badge>
                          </div>
                          <div className="sandbox-move-meta mt-2">
                            <span>eval {formatCentipawns(entry.centipawnsTotal)}</span>
                            <span>delta {formatCentipawns(entry.centipawnsCurrent)}</span>
                            <span>latency {typeof entry.latencyMs === 'number' ? `${entry.latencyMs} ms` : '—'}</span>
                          </div>
                          {entry.reasoning && <p className="sandbox-reasoning">{entry.reasoning}</p>}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="sandbox-collapsible-summary">
                    {moveLogEntries.length === 0
                      ? 'Move list is hidden.'
                      : `Move list hidden. Latest move: ${latestMove?.uci?.toUpperCase() ?? '—'} with ${moveLogEntries.length} total entries.`}
                  </div>
                )}
              </Card>

              <Card className="sandbox-log-panel p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="sandbox-log-title">Backend log</h3>
                    <p className="sandbox-log-subtitle">Control events and backend diagnostics</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{systemLog.length} entries</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setShowBackendLog((value) => !value)}>
                      {showBackendLog ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>
                {showBackendLog ? (
                  <div className="sandbox-backend-log-body space-y-2">
                    {systemLog.length === 0 ? (
                      <div className="text-muted-foreground">Waiting for stream…</div>
                    ) : (
                      systemLog.map((entry, idx) => (
                        <div key={`${entry}-${idx}`} className="break-words">
                          {entry}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="sandbox-collapsible-summary">
                    {systemLog.length === 0
                      ? 'Backend log is hidden.'
                      : `Backend log hidden. Latest entry: ${systemLog[0]}`}
                  </div>
                )}
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">Agent activity</h3>
                      <Badge variant="outline">{agents.length} agents</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowFlowChart((v) => !v)}>
                      {showFlowChart ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Optional workspace visualization. Not backend telemetry.
                  </p>
                </div>
                {showFlowChart && (
                  <div className="min-h-0">
                    <AgentFlowChart nodes={flowNodes} connections={flowConnections} />
                  </div>
                )}
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
