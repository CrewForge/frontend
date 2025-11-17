import React, { useState, useEffect } from 'react';
import { ChessBoard, BoardState } from './ChessBoard';
import { AgentFlowChart } from './AgentFlowChart';
import { GameResultsDialog } from './GameResultsDialog';
import { Agent } from './AgentCard';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { 
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight, 
  User, Cpu, Settings 
} from 'lucide-react';
import { motion } from 'motion/react';

interface SandboxPageProps {
  environment: string;
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

// Helper function to create initial chess board
const createInitialBoard = (): BoardState => {
  const board: BoardState = Array(8).fill(null).map(() => 
    Array(8).fill(null).map(() => ({ piece: null }))
  );
  const backRow: ('rook' | 'knight' | 'bishop' | 'queen' | 'king')[] = 
    ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  
  for (let i = 0; i < 8; i++) {
    board[0][i] = { piece: { type: backRow[i], color: 'black' } };
    board[1][i] = { piece: { type: 'pawn', color: 'black' } };
    board[6][i] = { piece: { type: 'pawn', color: 'white' } };
    board[7][i] = { piece: { type: backRow[i], color: 'white' } };
  }
  return board;
};

export function SandboxPage({ environment, onBack }: SandboxPageProps) {
  const [mode, setMode] = useState<'user' | 'stockfish'>('stockfish');
  const [isPlaying, setIsPlaying] = useState(false);
  const [board, setBoard] = useState<BoardState>(createInitialBoard());
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  
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

  // Auto-play in Stockfish mode
  useEffect(() => {
    if (isPlaying && mode === 'stockfish') {
      const timer = setTimeout(() => {
        setMoveCount(prev => prev + 1);
        
        // Simulate agent activity
        const activeNodeIdx = moveCount % flowNodes.length;
        setFlowNodes(nodes => nodes.map((node, idx) => ({
          ...node,
          status: idx === activeNodeIdx ? 'thinking' : 'idle',
          currentThought: idx === activeNodeIdx 
            ? `Analyzing move ${moveCount + 1}...` 
            : node.currentThought
        })));

        // Simulate connections
        setFlowConnections(conns => conns.map((conn, idx) => ({
          ...conn,
          active: idx === (moveCount % conns.length)
        })));

        // End game after 30 moves
        if (moveCount >= 30) {
          setIsPlaying(false);
          setResultsOpen(true);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, mode, moveCount, flowNodes.length]);

  const handleModeChange = (checked: boolean) => {
    setMode(checked ? 'stockfish' : 'user');
    setMoveCount(0);
    setIsPlaying(false);
    setBoard(createInitialBoard());
  };

  const handleStartGame = () => {
    setIsPlaying(true);
    setMoveCount(0);
    if (mode === 'stockfish') {
      // Auto-start in stockfish mode
      setFlowNodes(nodes => nodes.map(node => ({
        ...node,
        status: 'active'
      })));
    }
  };

  const handleRematch = () => {
    setResultsOpen(false);
    setMoveCount(0);
    setBoard(createInitialBoard());
    setIsPlaying(false);
    setFlowNodes(nodes => nodes.map(node => ({
      ...node,
      status: 'idle',
      currentThought: node.agent.isMetaAgent 
        ? 'Initializing team coordination...'
        : `Ready to assist`
    })));
  };

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
            <h3>Chess Strategy Environment</h3>
            <Badge variant="secondary">Sandbox</Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Mode Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted">
              <User className={`w-4 h-4 ${mode === 'user' ? 'text-primary' : 'text-muted-foreground'}`} />
              <Label htmlFor="mode-toggle" className="text-sm">User Mode</Label>
              <Switch 
                id="mode-toggle"
                checked={mode === 'stockfish'}
                onCheckedChange={handleModeChange}
              />
              <Label htmlFor="mode-toggle" className="text-sm">Stockfish Mode</Label>
              <Cpu className={`w-4 h-4 ${mode === 'stockfish' ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {!isPlaying ? (
                <Button onClick={handleStartGame}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Game
                </Button>
              ) : (
                <Button onClick={() => setIsPlaying(false)} variant="outline">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setBoard(createInitialBoard());
                  setMoveCount(0);
                  setIsPlaying(false);
                }}
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
            <Badge variant={isPlaying ? 'default' : 'outline'}>
              {isPlaying ? 'In Progress' : 'Ready'}
            </Badge>
          </div>
        </div>
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
                  <div className="text-sm font-mono space-y-1 max-h-32 overflow-auto">
                    <div>1. e4 e5</div>
                    <div>2. Nf3 Nc6</div>
                    <div>3. Bb5 a6</div>
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
