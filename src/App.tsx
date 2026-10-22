import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square as ChessJsSquare } from 'chess.js';
import {
  ArrowDefinition,
  EngineConfig,
  EngineEvaluationState,
  GameReviewReport,
  MoveHistoryItem,
  PieceColor,
  PieceType,
  Square,
  ClockState,
  TimeControlPreset,
} from './types/chess';
import { STARTING_FEN } from './chess/chess-logic';
import { calculateUndoStepCount } from './chess/board-editor-logic';
import { engineService } from './chess/engine-service';
import { playChessSound } from './chess/sound';
import { ChessBoard } from './components/ChessBoard';
import { EvalGauge } from './components/EvalGauge';
import { EnginePanel } from './components/EnginePanel';
import { MoveHistory } from './components/MoveHistory';
import { GameReviewModal } from './components/GameReviewModal';
import { PresetGamesModal } from './components/PresetGamesModal';
import { ImportExportModal } from './components/ImportExportModal';
import { BoardEditorModal } from './components/BoardEditorModal';
import { PresetGame } from './chess/preset-games';
import { ChessClock } from './components/ChessClock';
import { ClockConfigModal } from './components/ClockConfigModal';
import {
  addTimeToClock,
  calculateMaterialDifference,
  createInitialClockState,
  switchClockTurn,
  tickClock,
  TIME_CONTROL_PRESETS,
} from './chess/clock-logic';
import {
  RotateCcw,
  Sparkles,
  BookOpen,
  Share2,
  Clock,
  Play,
  Pause,
  Undo2,
  Edit3,
  User,
  Bot,
  Swords,
  Compass,
} from 'lucide-react';

export default function App() {
  // Game & Position state
  const [chessGame, setChessGame] = useState(() => new Chess());
  const [customStartingFen, setCustomStartingFen] = useState<string | null>(null);
  const [currentFen, setCurrentFen] = useState(STARTING_FEN);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);

  // Gameplay mode & side options
  const [gameMode, setGameMode] = useState<'vs-engine' | 'analysis'>('vs-engine');
  const [playerSide, setPlayerSide] = useState<PieceColor>('w');
  const [flipBoard, setFlipBoard] = useState(false);
  const [isEngineThinking, setIsEngineThinking] = useState(false);

  // Board settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [arrowsEnabled, setArrowsEnabled] = useState(true);

  // Tournament Dual-Clock state
  const [clockPreset, setClockPreset] = useState<TimeControlPreset>(TIME_CONTROL_PRESETS[5]); // 5+3 Blitz default
  const [clockState, setClockState] = useState<ClockState>(() => createInitialClockState(5, 3));
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);

  // Engine state
  const [isEngineActive, setIsEngineActive] = useState(true);
  const [engineConfig, setEngineConfig] = useState<EngineConfig>({
    strength: 'max',
    skillLevel: 20,
    targetDepth: 20,
    multiPv: 3,
    isApproximateMode: false,
    threads: 1,
  });
  const [evaluation, setEvaluation] = useState<EngineEvaluationState | null>(null);

  // Modals state
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [reviewReport, setReviewReport] = useState<GameReviewReport | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isBoardEditorOpen, setIsBoardEditorOpen] = useState(false);

  // Auto-flip orientation to match selected player side
  const handleSelectSide = useCallback((side: PieceColor) => {
    setGameMode('vs-engine');
    setPlayerSide(side);
    setFlipBoard(side === 'b');
  }, []);

  const handleSelectAnalysisMode = useCallback(() => {
    setGameMode('analysis');
  }, []);

  // Active FEN: depends on whether user is browsing move history or at the latest position
  const activeFen = useMemo(() => {
    if (currentMoveIndex === -1) {
      return customStartingFen || STARTING_FEN;
    }
    if (moveHistory[currentMoveIndex]) {
      return moveHistory[currentMoveIndex].fenAfter;
    }
    return currentFen;
  }, [currentMoveIndex, moveHistory, currentFen, customStartingFen]);

  // Last move highlights
  const lastMove = useMemo(() => {
    if (currentMoveIndex === -1 || !moveHistory[currentMoveIndex]) return null;
    const item = moveHistory[currentMoveIndex];
    return {
      from: item.uci.slice(0, 2) as Square,
      to: item.uci.slice(2, 4) as Square,
    };
  }, [currentMoveIndex, moveHistory]);

  // Run engine analysis whenever active FEN or engine config changes
  useEffect(() => {
    if (!isEngineActive) {
      engineService.stopAnalysis();
      return;
    }

    engineService.startAnalysis(activeFen, engineConfig, (newState) => {
      setEvaluation(newState);
    });

    return () => {
      engineService.stopAnalysis();
    };
  }, [activeFen, isEngineActive, engineConfig]);

  // Material difference calculation
  const material = useMemo(() => calculateMaterialDifference(activeFen), [activeFen]);

  // Dual-Clock timer loop (100ms precision for tournament simulation)
  useEffect(() => {
    if (!clockState.isRunning || !clockState.activeSide || clockState.flaggedSide) return;

    const interval = setInterval(() => {
      setClockState((prev) => {
        const updated = tickClock(prev, 100);
        if (updated.flaggedSide && !prev.flaggedSide) {
          if (soundEnabled) playChessSound('flag');
        }
        return updated;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [clockState.isRunning, clockState.activeSide, clockState.flaggedSide, soundEnabled]);

  // Board arrows calculation based on multi-PV recommendations and active move
  const boardArrows = useMemo<ArrowDefinition[]>(() => {
    if (!arrowsEnabled || !isEngineActive || !evaluation) return [];

    const arrows: ArrowDefinition[] = [];
    const lines = evaluation.multiPvLines.slice(0, engineConfig.multiPv);

    lines.forEach((line, idx) => {
      if (line.bestMoveUci && line.bestMoveUci.length >= 4) {
        const from = line.bestMoveUci.slice(0, 2) as Square;
        const to = line.bestMoveUci.slice(2, 4) as Square;

        if (idx === 0) {
          arrows.push({
            from,
            to,
            color: '#10b981', // Vibrant Emerald Best Move
            type: 'best',
            opacity: 0.9,
            label: '1',
          });
        } else if (idx === 1) {
          arrows.push({
            from,
            to,
            color: '#06b6d4', // Vibrant Cyan Alternative 2
            type: 'alternative-1',
            opacity: 0.8,
            label: '2',
          });
        } else if (idx === 2) {
          arrows.push({
            from,
            to,
            color: '#f59e0b', // Vibrant Amber Alternative 3
            type: 'alternative-2',
            opacity: 0.75,
            label: '3',
          });
        }
      }
    });

    // If current viewed move was a blunder from review, add threat arrow
    if (currentMoveIndex >= 0 && moveHistory[currentMoveIndex]) {
      const cur = moveHistory[currentMoveIndex];
      if (cur.classification === 'blunder' && cur.bestAlternativeUci) {
        arrows.unshift({
          from: cur.bestAlternativeUci.slice(0, 2) as Square,
          to: cur.bestAlternativeUci.slice(2, 4) as Square,
          color: '#f43f5e',
          type: 'threat',
          opacity: 0.95,
          label: '!',
        });
      }
    }

    return arrows;
  }, [arrowsEnabled, isEngineActive, evaluation, engineConfig.multiPv, currentMoveIndex, moveHistory]);

  // Handle move on board
  const handleBoardMove = useCallback(
    (from: Square, to: Square, promotion?: PieceType) => {
      try {
        // Reconstruct game from current move point if user made a move while browsing history
        const baseFen = customStartingFen || STARTING_FEN;
        const newGame = new Chess(baseFen);
        const replayMoves = moveHistory.slice(0, currentMoveIndex + 1);
        for (const m of replayMoves) {
          newGame.move({
            from: m.uci.slice(0, 2) as ChessJsSquare,
            to: m.uci.slice(2, 4) as ChessJsSquare,
            promotion: m.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
          });
        }

        const fenBefore = newGame.fen();
        const move = newGame.move({
          from: from as ChessJsSquare,
          to: to as ChessJsSquare,
          promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
        });

        if (move) {
          const fenAfter = newGame.fen();
          const newMoveItem: MoveHistoryItem = {
            index: replayMoves.length,
            moveNumber: Math.floor(replayMoves.length / 2) + 1,
            color: move.color,
            san: move.san,
            uci: `${from}${to}${promotion || ''}`,
            fenBefore,
            fenAfter,
            captured: move.captured as PieceType | undefined,
            promotion: move.promotion as PieceType | undefined,
            check: newGame.inCheck(),
            checkmate: newGame.isCheckmate(),
          };

          const updatedMoves = [...replayMoves, newMoveItem];
          setChessGame(newGame);
          setMoveHistory(updatedMoves);
          setCurrentMoveIndex(updatedMoves.length - 1);
          setCurrentFen(fenAfter);
          setReviewReport(null);

          // Switch dual clock turn and apply increment
          const nextTurn = move.color === 'w' ? 'b' : 'w';
          setClockState((prev) => switchClockTurn(prev, nextTurn));
        }
      } catch (err) {
        console.warn('Error handling move:', err);
      }
    },
    [currentMoveIndex, moveHistory, customStartingFen]
  );

  // Engine automated response effect (plays opposite color when in vs-engine mode)
  useEffect(() => {
    if (gameMode !== 'vs-engine') return;
    if (chessGame.isGameOver()) return;

    const currentTurn = chessGame.turn() as PieceColor;
    const isEngineTurn = currentTurn !== playerSide;

    // Only make engine move if at the latest position
    const isAtLatest = currentMoveIndex === moveHistory.length - 1;
    if (!isEngineTurn || !isAtLatest) return;

    let isCancelled = false;
    setIsEngineThinking(true);

    const timer = setTimeout(async () => {
      try {
        const engineMove = await engineService.getEngineMove(
          chessGame.fen(),
          engineConfig.skillLevel,
          engineConfig.targetDepth
        );

        if (!isCancelled && engineMove) {
          handleBoardMove(engineMove.from, engineMove.to, engineMove.promotion);
        }
      } catch (err) {
        console.warn('Engine move error:', err);
      } finally {
        if (!isCancelled) setIsEngineThinking(false);
      }
    }, 450);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      setIsEngineThinking(false);
    };
  }, [
    gameMode,
    playerSide,
    chessGame,
    currentMoveIndex,
    moveHistory.length,
    engineConfig.skillLevel,
    engineConfig.targetDepth,
    handleBoardMove,
  ]);

  // Undo Move: takes back 2 moves in vs-engine mode so player can re-try, or 1 move in free analysis
  const handleUndoMove = useCallback(() => {
    if (moveHistory.length === 0) return;

    const currentTurn = chessGame.turn() as PieceColor;
    const steps = calculateUndoStepCount(
      moveHistory.length,
      gameMode === 'vs-engine',
      playerSide,
      currentTurn
    );

    if (steps <= 0) return;

    const remainingMoves = moveHistory.slice(0, moveHistory.length - steps);
    const baseFen = customStartingFen || STARTING_FEN;
    const restoredGame = new Chess(baseFen);

    for (const m of remainingMoves) {
      restoredGame.move({
        from: m.uci.slice(0, 2) as ChessJsSquare,
        to: m.uci.slice(2, 4) as ChessJsSquare,
        promotion: m.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      });
    }

    const newFen = restoredGame.fen();
    setChessGame(restoredGame);
    setMoveHistory(remainingMoves);
    setCurrentMoveIndex(remainingMoves.length - 1);
    setCurrentFen(newFen);
    setReviewReport(null);

    // Update clock turn to the restored turn
    setClockState((prev) => ({
      ...prev,
      activeSide: restoredGame.turn() as PieceColor,
    }));

    if (soundEnabled) playChessSound('move');
  }, [moveHistory, gameMode, playerSide, chessGame, customStartingFen, soundEnabled]);

  // Reset Game to standard starting position
  const handleResetGame = useCallback(() => {
    const g = new Chess();
    setChessGame(g);
    setCustomStartingFen(null);
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setCurrentFen(STARTING_FEN);
    setReviewReport(null);
    setClockState(createInitialClockState(clockPreset.baseMinutes, clockPreset.incrementSeconds));
    if (soundEnabled) playChessSound('move');
  }, [clockPreset, soundEnabled]);

  // Apply custom board position from BoardEditorModal
  const handleApplyCustomFen = useCallback(
    (fen: string) => {
      try {
        const g = new Chess(fen);
        setChessGame(g);
        setCustomStartingFen(fen === STARTING_FEN ? null : fen);
        setMoveHistory([]);
        setCurrentMoveIndex(-1);
        setCurrentFen(fen);
        setReviewReport(null);

        const turn = g.turn() as PieceColor;
        setClockState((prev) => ({
          ...createInitialClockState(clockPreset.baseMinutes, clockPreset.incrementSeconds),
          activeSide: turn,
          isRunning: false,
        }));

        if (soundEnabled) playChessSound('move');
      } catch (err) {
        console.warn('Failed to apply custom position:', err);
      }
    },
    [clockPreset, soundEnabled]
  );

  // Jump to specific move
  const handleSelectMove = useCallback((index: number) => {
    setCurrentMoveIndex(index);
  }, []);

  // Keyboard navigation for moves (Left/Right arrow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentMoveIndex((prev) => Math.max(-1, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentMoveIndex((prev) => Math.min(moveHistory.length - 1, prev + 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentMoveIndex(-1);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentMoveIndex(moveHistory.length - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveHistory.length]);

  // Load preset master game
  const handleSelectPresetGame = useCallback(
    (game: PresetGame) => {
      try {
        const g = new Chess();
        g.loadPgn(game.pgn);

        const history = g.history({ verbose: true });
        const replayGame = new Chess();
        const parsedMoves: MoveHistoryItem[] = [];

        for (let i = 0; i < history.length; i++) {
          const m = history[i];
          const fenBefore = replayGame.fen();
          const applied = replayGame.move(m);
          if (!applied) break;
          const fenAfter = replayGame.fen();

          parsedMoves.push({
            index: i,
            moveNumber: Math.floor(i / 2) + 1,
            color: applied.color,
            san: applied.san,
            uci: `${applied.from}${applied.to}${applied.promotion || ''}`,
            fenBefore,
            fenAfter,
            captured: applied.captured as PieceType | undefined,
            promotion: applied.promotion as PieceType | undefined,
            check: replayGame.inCheck(),
            checkmate: replayGame.isCheckmate(),
          });
        }

        setChessGame(g);
        setCustomStartingFen(null);
        setMoveHistory(parsedMoves);
        setCurrentMoveIndex(parsedMoves.length - 1);
        setCurrentFen(g.fen());
        setReviewReport(null);
        if (soundEnabled) playChessSound('move');
      } catch (err) {
        console.warn('Failed to load preset game:', err);
      }
    },
    [soundEnabled]
  );

  // Import FEN
  const handleImportFen = useCallback((fen: string): boolean => {
    try {
      const g = new Chess(fen);
      setChessGame(g);
      setCustomStartingFen(fen === STARTING_FEN ? null : fen);
      setMoveHistory([]);
      setCurrentMoveIndex(-1);
      setCurrentFen(g.fen());
      setReviewReport(null);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Import PGN
  const handleImportPgn = useCallback((pgn: string): boolean => {
    try {
      const g = new Chess();
      g.loadPgn(pgn);
      const history = g.history({ verbose: true });
      const replayGame = new Chess();
      const parsedMoves: MoveHistoryItem[] = [];

      for (let i = 0; i < history.length; i++) {
        const m = history[i];
        const fenBefore = replayGame.fen();
        const applied = replayGame.move(m);
        if (!applied) break;
        const fenAfter = replayGame.fen();

        parsedMoves.push({
          index: i,
          moveNumber: Math.floor(i / 2) + 1,
          color: applied.color,
          san: applied.san,
          uci: `${applied.from}${applied.to}${applied.promotion || ''}`,
          fenBefore,
          fenAfter,
          captured: applied.captured as PieceType | undefined,
          promotion: applied.promotion as PieceType | undefined,
          check: replayGame.inCheck(),
          checkmate: replayGame.isCheckmate(),
        });
      }

      setChessGame(g);
      setCustomStartingFen(null);
      setMoveHistory(parsedMoves);
      setCurrentMoveIndex(parsedMoves.length - 1);
      setCurrentFen(g.fen());
      setReviewReport(null);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Dual-Clock controls
  const handleSelectClockPreset = useCallback((preset: TimeControlPreset) => {
    setClockPreset(preset);
    setClockState(createInitialClockState(preset.baseMinutes, preset.incrementSeconds));
  }, []);

  const handleCustomClockTimeControl = useCallback((baseMins: number, incSecs: number) => {
    const customPreset: TimeControlPreset = {
      id: `custom-${baseMins}-${incSecs}`,
      name: `${baseMins}+${incSecs} Custom`,
      category: 'custom',
      baseMinutes: baseMins,
      incrementSeconds: incSecs,
    };
    setClockPreset(customPreset);
    setClockState(createInitialClockState(baseMins, incSecs));
  }, []);

  const handleToggleClock = useCallback(() => {
    if (clockState.flaggedSide) return;
    setClockState((prev) => ({
      ...prev,
      isRunning: !prev.isRunning,
      activeSide: prev.activeSide || (chessGame.turn() as PieceColor),
    }));
  }, [clockState.flaggedSide, chessGame]);

  const handleResetClock = useCallback(() => {
    setClockState(createInitialClockState(clockPreset.baseMinutes, clockPreset.incrementSeconds));
  }, [clockPreset]);

  // Run Full Game Review
  const handleRunGameReview = useCallback(async () => {
    if (moveHistory.length === 0 || isReviewing) return;

    if (reviewReport) {
      setIsReviewModalOpen(true);
      return;
    }

    setIsReviewing(true);
    setReviewProgress(0);

    try {
      const report = await engineService.runGameReview(moveHistory, (pct) => {
        setReviewProgress(pct);
      });

      setReviewReport(report);
      setMoveHistory(report.analyzedMoves);
      setIsReviewModalOpen(true);
    } catch (err) {
      console.warn('Game review error:', err);
    } finally {
      setIsReviewing(false);
    }
  }, [moveHistory, isReviewing, reviewReport]);

  // Current PGN for export
  const currentPgn = useMemo(() => {
    try {
      return chessGame.pgn();
    } catch {
      return '';
    }
  }, [chessGame]);

  const topPlayerColor = flipBoard ? 'w' : 'b';
  const bottomPlayerColor = flipBoard ? 'b' : 'w';
  const currentTurn = chessGame.turn() as PieceColor;
  const isPlayerTurn = gameMode === 'vs-engine' ? currentTurn === playerSide : true;

  return (
    <div className="min-h-screen bg-[#121417] text-zinc-100 flex flex-col font-sans selection:bg-blue-600/30">
      {/* Top Navigation Bar with Let’s Win Chess Branding */}
      <header className="border-b border-zinc-800/80 bg-[#16181d]/90 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center shadow-lg shadow-blue-900/40 border border-blue-400/30">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 22H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1zm-4-4H9l1-3.5-2.5-1.5 1-2.5L7 8.5 8 5l3-1 2 2 3 1-1 3.5 2 2.5-2 5z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Let’s Win Chess
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Stockfish 10
                </span>
                {customStartingFen && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Custom Board
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Professional analysis • Interactive board editor • Play vs Stockfish • Dual tournament clock
              </p>
            </div>
          </div>

          {/* Side Selector & Main Mode Controls */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Choose Side: White / Black / Free Analysis */}
            <div className="flex items-center bg-zinc-900/90 rounded-xl p-1 border border-zinc-800 shadow-inner">
              <button
                type="button"
                onClick={() => handleSelectSide('w')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  gameMode === 'vs-engine' && playerSide === 'w'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Play as White against Stockfish (White moves first)"
                aria-label="Play as White"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400 inline-block" />
                Play White
              </button>

              <button
                type="button"
                onClick={() => handleSelectSide('b')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  gameMode === 'vs-engine' && playerSide === 'b'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Play as Black against Stockfish (Board flips to Black)"
                aria-label="Play as Black"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-600 inline-block" />
                Play Black
              </button>

              <button
                type="button"
                onClick={handleSelectAnalysisMode}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  gameMode === 'analysis'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Free Analysis mode (make moves for both sides freely)"
                aria-label="Free Analysis Mode"
              >
                <Compass className="w-3.5 h-3.5" />
                Analysis
              </button>
            </div>

            {/* Quick Action Modals */}
            <button
              onClick={() => setIsBoardEditorOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Set up custom chess pieces and position"
              aria-label="Open Board Editor"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              Edit Board
            </button>

            <button
              onClick={() => setIsClockModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Configure tournament clock time controls"
              aria-label="Tournament Clock Settings"
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{clockPreset.name}</span>
            </button>

            <button
              onClick={handleRunGameReview}
              disabled={moveHistory.length === 0 || isReviewing}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/30 border border-blue-400/30"
              aria-label="Run Game Review"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              {isReviewing ? `Reviewing (${reviewProgress}%)` : 'Game Review'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">
        {/* Left Column: Dual-Clocks, Evaluation Gauge + Interactive Chessboard */}
        <div className="flex flex-col items-center gap-2.5 w-full max-w-[650px] mx-auto">
          {/* Top Player Tournament Clock */}
          <ChessClock
            side={topPlayerColor}
            timeMs={topPlayerColor === 'w' ? clockState.whiteTimeMs : clockState.blackTimeMs}
            isActive={clockState.isRunning && clockState.activeSide === topPlayerColor}
            isFlagged={clockState.flaggedSide === topPlayerColor}
            playerName={
              gameMode === 'vs-engine'
                ? topPlayerColor === playerSide
                  ? 'You'
                  : 'Stockfish Engine'
                : topPlayerColor === 'w'
                ? 'White'
                : 'Black'
            }
            capturedPieces={
              topPlayerColor === 'w' ? material.capturedByWhite : material.capturedByBlack
            }
            materialAdvantage={
              topPlayerColor === 'w'
                ? Math.max(0, material.whiteAdvantage)
                : Math.max(0, -material.whiteAdvantage)
            }
            onAddBonusTime={() =>
              setClockState((prev) => addTimeToClock(prev, topPlayerColor, 15000))
            }
            orientation="top"
          />

          {/* Chess Board & Vertical Eval Gauge Container */}
          <div className="flex items-stretch gap-2 sm:gap-3 w-full justify-center">
            {/* Real-time Vertical Evaluation Gauge */}
            <div className="h-[320px] sm:h-[480px] md:h-[540px] max-h-[600px]">
              <EvalGauge evaluation={evaluation} flip={flipBoard} />
            </div>

            {/* Interactive Chess Board */}
            <div className="w-full max-w-[550px]">
              <ChessBoard
                fen={activeFen}
                flip={flipBoard}
                arrows={boardArrows}
                lastMove={lastMove}
                onMove={handleBoardMove}
                isInteractive={
                  currentMoveIndex === moveHistory.length - 1 &&
                  (gameMode === 'analysis' || (gameMode === 'vs-engine' && isPlayerTurn && !isEngineThinking))
                }
              />
            </div>
          </div>

          {/* Bottom Player Tournament Clock */}
          <ChessClock
            side={bottomPlayerColor}
            timeMs={bottomPlayerColor === 'w' ? clockState.whiteTimeMs : clockState.blackTimeMs}
            isActive={clockState.isRunning && clockState.activeSide === bottomPlayerColor}
            isFlagged={clockState.flaggedSide === bottomPlayerColor}
            playerName={
              gameMode === 'vs-engine'
                ? bottomPlayerColor === playerSide
                  ? 'You'
                  : 'Stockfish Engine'
                : bottomPlayerColor === 'w'
                ? 'White'
                : 'Black'
            }
            capturedPieces={
              bottomPlayerColor === 'w' ? material.capturedByWhite : material.capturedByBlack
            }
            materialAdvantage={
              bottomPlayerColor === 'w'
                ? Math.max(0, material.whiteAdvantage)
                : Math.max(0, -material.whiteAdvantage)
            }
            onAddBonusTime={() =>
              setClockState((prev) => addTimeToClock(prev, bottomPlayerColor, 15000))
            }
            orientation="bottom"
          />

          {/* Control Toolbar: Undo Move, Edit Board, Reset Board, Flip Board, Clock Controls */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs shadow-md">
            {/* Left Actions: Undo Move & Edit Board */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUndoMove}
                disabled={moveHistory.length === 0}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-200 border border-zinc-700 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                title={
                  gameMode === 'vs-engine'
                    ? 'Undo both your move and the engine reply to try again'
                    : 'Undo the last move'
                }
                aria-label="Undo Move"
              >
                <Undo2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Undo Move</span>
                {gameMode === 'vs-engine' && moveHistory.length >= 2 && (
                  <span className="text-[10px] text-zinc-400 font-normal">(-2)</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsBoardEditorOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                title="Open position editor to place, move, or remove pieces"
                aria-label="Edit Board Position"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Edit Board</span>
              </button>

              <button
                type="button"
                onClick={handleResetGame}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-rose-400 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                title="Reset board to standard starting position"
                aria-label="Reset Board"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset</span>
              </button>
            </div>

            {/* Right Actions: Turn Status, Clock & Board Flip */}
            <div className="flex items-center gap-2">
              {/* Turn & Engine status indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-semibold">
                {isEngineThinking ? (
                  <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                    <Bot className="w-3.5 h-3.5" />
                    Engine thinking...
                  </span>
                ) : (
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full border ${
                        currentTurn === 'w'
                          ? 'bg-white border-zinc-400'
                          : 'bg-zinc-950 border-zinc-600'
                      }`}
                    />
                    {currentTurn === 'w' ? 'White to move' : 'Black to move'}
                    {gameMode === 'vs-engine' && (
                      <span className="text-[10px] text-zinc-400 font-normal">
                        ({currentTurn === playerSide ? 'Your turn' : 'Engine'})
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Clock Play/Pause */}
              <button
                type="button"
                onClick={handleToggleClock}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border ${
                  clockState.isRunning
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                }`}
                title={clockState.isRunning ? 'Pause clock' : 'Start clock timer'}
                aria-label={clockState.isRunning ? 'Pause clock' : 'Start clock'}
              >
                {clockState.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {clockState.isRunning ? 'Pause' : 'Clock'}
              </button>

              {/* Flip Board */}
              <button
                type="button"
                onClick={() => setFlipBoard(!flipBoard)}
                className="text-[11px] text-zinc-300 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                title="Flip board orientation"
                aria-label="Flip Board Orientation"
              >
                <RotateCcw className="w-3 h-3 text-blue-400" />
                Flip
              </button>
            </div>
          </div>

          {/* Flagged Timeout Notice Banner */}
          {clockState.flaggedSide && (
            <div className="w-full p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/60 text-rose-300 text-xs flex items-center justify-between animate-pulse shadow-lg">
              <span className="font-bold">
                ⚠️ Time Out: {clockState.flaggedSide === 'w' ? 'White' : 'Black'} has flagged on time!
              </span>
              <button
                onClick={handleResetClock}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors"
              >
                Reset Clock
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Engine Analysis & Move Sheet */}
        <div className="flex flex-col gap-5 w-full">
          {/* Stockfish Engine Panel */}
          <EnginePanel
            config={engineConfig}
            evaluation={evaluation}
            onConfigChange={(newCfg) => setEngineConfig((prev) => ({ ...prev, ...newCfg }))}
            onPreviewPvMove={(moves) => {
              // PV preview
            }}
            isEngineActive={isEngineActive}
            onToggleEngine={() => setIsEngineActive(!isEngineActive)}
          />

          {/* Move History Sheet & Review Actions */}
          <MoveHistory
            moves={moveHistory}
            currentMoveIndex={currentMoveIndex}
            onSelectMove={handleSelectMove}
            onFlipBoard={() => setFlipBoard(!flipBoard)}
            onOpenPresets={() => setIsPresetsModalOpen(true)}
            onOpenImportExport={() => setIsImportExportModalOpen(true)}
            onOpenBoardEditor={() => setIsBoardEditorOpen(true)}
            onUndoMove={handleUndoMove}
            canUndo={moveHistory.length > 0}
            onRunReview={handleRunGameReview}
            isReviewing={isReviewing}
            hasReviewReport={Boolean(reviewReport)}
            onResetGame={handleResetGame}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            arrowsEnabled={arrowsEnabled}
            onToggleArrows={() => setArrowsEnabled(!arrowsEnabled)}
          />
        </div>
      </main>

      {/* Modals */}
      <BoardEditorModal
        isOpen={isBoardEditorOpen}
        onClose={() => setIsBoardEditorOpen(false)}
        initialFen={activeFen}
        onApplyFen={handleApplyCustomFen}
      />

      <ClockConfigModal
        isOpen={isClockModalOpen}
        onClose={() => setIsClockModalOpen(false)}
        currentPresetId={clockPreset.id}
        onSelectPreset={handleSelectClockPreset}
        onCustomTimeControl={handleCustomClockTimeControl}
        onResetClock={handleResetClock}
        isRunning={clockState.isRunning}
        onToggleClock={handleToggleClock}
      />

      {reviewReport && (
        <GameReviewModal
          report={reviewReport}
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onNavigateToMove={handleSelectMove}
        />
      )}

      <PresetGamesModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        onSelectGame={handleSelectPresetGame}
      />

      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        currentFen={activeFen}
        currentPgn={currentPgn}
        onImportFen={handleImportFen}
        onImportPgn={handleImportPgn}
      />
    </div>
  );
}
