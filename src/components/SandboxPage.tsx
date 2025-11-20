import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChessBoard, BoardState } from './ChessBoard';
import { AgentFlowChart } from './AgentFlowChart';
import { GameResultsDialog } from './GameResultsDialog';
import { Agent } from './AgentCard';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { 
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Chess } from 'chess.js';
import { authHeaders, streamChessAutoUrl } from '../lib/api';

interface SandboxPageProps {
  environment: string;
  token: string;
  onBack: () => void;
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

export function SandboxPage({ environment, token, onBack }: SandboxPageProps) {
  const mode: 'user' | 'stockfish' = 'stockfish';
  const environmentLabel = environment === 'chess' ? 'Chess Strategy Environment' : environment;
  const [isPlaying, setIsPlaying] = useState(false);
  const [board, setBoard] = useState<BoardState>(createInitialBoard());
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [moveLogEntries, setMoveLogEntries] = useState<Array<{ ply: number; uci: string; player: string; reasoning?: string }>>([]);
  const [systemLog, setSystemLog] = useState<string[]>([]);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Awaiting start');
  const abortControllerRef = useRef<AbortController | null>(null);
  const chessRef = useRef(new Chess());
  
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

  // Game results
  const gameResults = {
    winner: 'white' as const,
    moves: 42,
    duration: '12:34',
    performanceDelta: 18.5,
    tokensCost: 3421,
    keyMoments: [
      'Ava suggested strong center control with e4',
      'Ravi identified knight fork opportunity',
      'Elena calculated advantage after exchange',
      'Kai defended against kingside attack',
      'Meta-agent coordinated final attack sequence'
    ]
  };

  const resetBoardState = useCallback(() => {
    chessRef.current = new Chess();
    setBoard(buildBoardState(chessRef.current));
    setMoveCount(0);
    setMoveLogEntries([]);
    setSystemLog([]);
    setAutoError(null);
    setStatusMessage('Awaiting start');
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

  const processPayload = useCallback(
    (payload: Record<string, any>) => {
      if (!payload || typeof payload !== 'object') {
        appendSystemLog('Received unknown payload');
        return false;
      }

      if (payload.type === 'event' && payload.uci) {
        try {
          chessRef.current.move(payload.uci, { sloppy: true });
          setBoard(buildBoardState(chessRef.current, payload.uci));
          setMoveCount((prev) => prev + 1);
          setMoveLogEntries((prev) => [
            ...prev.slice(-49),
            {
              ply: typeof payload.ply === 'number' ? payload.ply : prev.length,
              uci: payload.uci,
              player: payload.player || 'agent',
              reasoning: payload.reasoning,
            },
          ]);
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
        setStatusMessage('Environment complete');
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
    [appendSystemLog],
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

      if (!response.ok || !response.body) {
        throw new Error('Unable to start chess environment.');
      }

      setStatusMessage('Streaming live game');
      setFlowNodes(nodes => nodes.map((node, idx) => ({
        ...node,
        status: idx === 0 ? 'active' : 'idle',
        currentThought: idx === 0 ? 'Coordinating live match' : node.currentThought,
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

      setStatusMessage('Environment complete');
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        appendSystemLog('Stream aborted.');
        setStatusMessage('Stream paused');
      } else {
        setAutoError(err.message || 'Failed to stream environment.');
        setStatusMessage('Stream error');
      }
    } finally {
      setIsPlaying(false);
      abortControllerRef.current = null;
    }
  }, [appendSystemLog, processLine, resetBoardState, token]);

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
  }, [handleStopStream, resetBoardState]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleStartGame = useCallback(() => {
    void startAutoStream();
  }, [startAutoStream]);

  const handleRematch = useCallback(() => {
    setResultsOpen(false);
    void startAutoStream();
  }, [startAutoStream]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <h3>{environmentLabel}</h3>
            <Badge variant="secondary">Sandbox</Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted text-sm">
              <span className="text-muted-foreground">Mode</span>
              <Badge variant="secondary">AI vs Stockfish</Badge>
              <span className="text-muted-foreground">(auto)</span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {!isPlaying ? (
                <Button onClick={handleStartGame} disabled={!token}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Game
                </Button>
              ) : (
                <Button onClick={handleStopStream} variant="outline">
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Stream
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleResetBoard}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Game Status */}
        <div className="flex items-center gap-6 mt-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Mode:</span>
            <Badge variant={mode === 'user' ? 'default' : 'secondary'}>
              {mode === 'user' ? 'User vs AI' : 'AI vs Stockfish'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Move:</span>
            <span>{moveCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={autoError ? 'destructive' : isPlaying ? 'default' : 'outline'}>
              {autoError ? 'Error' : isPlaying ? 'Streaming' : 'Idle'}
            </Badge>
            <span className="text-muted-foreground">{statusMessage}</span>
          </div>
        </div>
        {autoError && (
          <div className="mt-2 text-sm text-destructive">
            {autoError}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chess Board */}
        <motion.div 
          className="border-r flex flex-col bg-card"
          initial={false}
          animate={{ 
            width: leftPanelCollapsed ? '48px' : '50%' 
          }}
          transition={{ duration: 0.3 }}
        >
          {leftPanelCollapsed ? (
            <div className="flex-1 flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLeftPanelCollapsed(false)}
                className="rotate-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3>Chess Board</h3>
                  <p className="text-sm text-muted-foreground">
                    {mode === 'user' ? 'Your turn as White' : 'Observing AI gameplay'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLeftPanelCollapsed(true)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                <motion.div
                  key={moveCount}
                  initial={{ opacity: 0.8, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChessBoard board={board} />
                </motion.div>
              </div>

              {/* Move Log */}
              <div className="p-4 border-t">
                <Card className="p-4">
                  <h4 className="mb-3">Move Log</h4>
                  <div className="text-sm font-mono space-y-1 max-h-48 overflow-auto">
                    {moveLogEntries.length === 0 ? (
                      <div className="text-muted-foreground">No moves streamed yet.</div>
                    ) : (
                      moveLogEntries.map((entry, idx) => (
                        <div key={`${entry.ply}-${entry.uci}-${idx}`} className="flex flex-col">
                          <span>
                            {entry.ply + 1}. {entry.uci.toUpperCase()} — {entry.player}
                          </span>
                          {entry.reasoning && (
                            <span className="text-xs text-muted-foreground">
                              {entry.reasoning}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
                <Card className="p-4 mt-4">
                  <h4 className="mb-3">Engine Output</h4>
                  <div className="text-xs font-mono space-y-1 max-h-32 overflow-auto">
                    {systemLog.length === 0 ? (
                      <div className="text-muted-foreground">Waiting for stream…</div>
                    ) : (
                      systemLog.map((entry, idx) => (
                        <div key={`${entry}-${idx}`}>{entry}</div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
        </motion.div>

        {/* Right Panel - Flow Chart */}
        <motion.div 
          className="flex flex-col bg-background"
          initial={false}
          animate={{ 
            width: rightPanelCollapsed ? '48px' : '50%' 
          }}
          transition={{ duration: 0.3 }}
        >
          {rightPanelCollapsed ? (
            <div className="flex-1 flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRightPanelCollapsed(false)}
                className="rotate-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3>Agent Flow</h3>
                  <Badge variant="outline">{agents.length} agents</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRightPanelCollapsed(true)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <AgentFlowChart nodes={flowNodes} connections={flowConnections} />
            </>
          )}
        </motion.div>
      </div>

      {/* Game Results Dialog */}
      <GameResultsDialog
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        onViewDetails={() => {
          setResultsOpen(false);
          // Navigate to detailed results page
        }}
        onRematch={handleRematch}
        results={gameResults}
        mode={mode}
      />
    </div>
  );
}
