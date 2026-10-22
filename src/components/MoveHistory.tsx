import React, { useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Share2,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Play,
  Pause,
  Undo2,
  Edit3,
} from 'lucide-react';
import { MoveClassification, MoveHistoryItem } from '../types/chess';

interface MoveHistoryProps {
  moves: MoveHistoryItem[];
  currentMoveIndex: number; // -1 means starting position
  onSelectMove: (index: number) => void;
  onFlipBoard: () => void;
  onOpenPresets: () => void;
  onOpenImportExport: () => void;
  onOpenBoardEditor?: () => void;
  onUndoMove?: () => void;
  canUndo?: boolean;
  onRunReview: () => void;
  isReviewing?: boolean;
  hasReviewReport?: boolean;
  onResetGame: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  arrowsEnabled: boolean;
  onToggleArrows: () => void;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  currentMoveIndex,
  onSelectMove,
  onFlipBoard,
  onOpenPresets,
  onOpenImportExport,
  onOpenBoardEditor,
  onUndoMove,
  canUndo,
  onRunReview,
  isReviewing,
  hasReviewReport,
  onResetGame,
  soundEnabled,
  onToggleSound,
  arrowsEnabled,
  onToggleArrows,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Auto scroll to active move
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentMoveIndex]);

  // Auto-play loop
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      if (currentMoveIndex < moves.length - 1) {
        onSelectMove(currentMoveIndex + 1);
      } else {
        setIsPlaying(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, currentMoveIndex, moves.length, onSelectMove]);

  // Group moves into pairs (White & Black)
  const movePairs: {
    moveNumber: number;
    white?: MoveHistoryItem;
    black?: MoveHistoryItem;
  }[] = [];

  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const renderClassificationBadge = (c?: MoveClassification) => {
    if (!c) return null;
    switch (c) {
      case 'brilliant':
        return <span className="text-[10px] px-1 font-bold rounded bg-teal-500/20 text-teal-400 border border-teal-500/30" title="Brilliant Move">!!</span>;
      case 'great':
        return <span className="text-[10px] px-1 font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30" title="Great Move">!</span>;
      case 'best':
        return <span className="text-[10px] px-1 font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" title="Best Move">★</span>;
      case 'inaccuracy':
        return <span className="text-[10px] px-1 font-bold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" title="Inaccuracy">?!</span>;
      case 'mistake':
        return <span className="text-[10px] px-1 font-bold rounded bg-orange-500/20 text-orange-400 border border-orange-500/30" title="Mistake">?</span>;
      case 'blunder':
        return <span className="text-[10px] px-1 font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30" title="Blunder">??</span>;
      default:
        return null;
    }
  };

  return (
    <div
      className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl backdrop-blur-md h-full min-h-[380px]"
      data-testid="move-history"
    >
      {/* Top action toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 font-sans">
          Move History
          <span className="text-xs font-mono font-normal text-zinc-400">
            ({moves.length} moves)
          </span>
        </h3>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleArrows}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              arrowsEnabled
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
            }`}
            title={arrowsEnabled ? 'Hide engine arrows' : 'Show engine arrows'}
            aria-label="Toggle Engine Arrows"
          >
            {arrowsEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              soundEnabled
                ? 'bg-zinc-800/80 border-zinc-700/80 text-zinc-200'
                : 'bg-zinc-800/40 border-zinc-800 text-zinc-500'
            }`}
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onFlipBoard}
            className="p-1.5 rounded-lg border border-zinc-700/80 bg-zinc-800/80 text-zinc-300 hover:text-white transition-colors"
            title="Flip Board View"
            aria-label="Flip Board"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Move list table */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto max-h-[250px] min-h-[160px] pr-1 flex flex-col divide-y divide-zinc-800/50 text-xs font-mono select-none"
      >
        {movePairs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-center py-8">
            Make moves on the board or load a game to begin analysis
          </div>
        ) : (
          movePairs.map((pair) => (
            <div
              key={pair.moveNumber}
              className="grid grid-cols-[38px_1fr_1fr] py-1 items-center hover:bg-zinc-800/30 transition-colors rounded"
            >
              <span className="text-zinc-500 text-right pr-2">
                {pair.moveNumber}.
              </span>

              {/* White move */}
              {pair.white ? (
                <button
                  onClick={() => onSelectMove(pair.white!.index)}
                  data-active={currentMoveIndex === pair.white.index}
                  className={`text-left px-2 py-1 rounded flex items-center justify-between transition-colors ${
                    currentMoveIndex === pair.white.index
                      ? 'bg-blue-600/30 text-blue-200 font-bold border border-blue-500/40'
                      : 'text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <span>{pair.white.san}</span>
                  {renderClassificationBadge(pair.white.classification)}
                </button>
              ) : (
                <div />
              )}

              {/* Black move */}
              {pair.black ? (
                <button
                  onClick={() => onSelectMove(pair.black!.index)}
                  data-active={currentMoveIndex === pair.black.index}
                  className={`text-left px-2 py-1 rounded flex items-center justify-between transition-colors ${
                    currentMoveIndex === pair.black.index
                      ? 'bg-blue-600/30 text-blue-200 font-bold border border-blue-500/40'
                      : 'text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <span>{pair.black.san}</span>
                  {renderClassificationBadge(pair.black.classification)}
                </button>
              ) : (
                <div />
              )}
            </div>
          ))
        )}
      </div>

      {/* Navigation Buttons: First, Prev, Play, Next, Latest */}
      <div className="grid grid-cols-5 gap-1 pt-1 border-t border-zinc-800/80">
        <button
          onClick={() => onSelectMove(-1)}
          disabled={currentMoveIndex === -1}
          className="py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 disabled:hover:text-zinc-400 flex items-center justify-center transition-all"
          title="Start Position (Home)"
          aria-label="Go to First Move"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectMove(Math.max(-1, currentMoveIndex - 1))}
          disabled={currentMoveIndex === -1}
          className="py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 disabled:hover:text-zinc-400 flex items-center justify-center transition-all"
          title="Previous Move (Left Arrow)"
          aria-label="Go to Previous Move"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={moves.length === 0}
          className={`py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white'
          }`}
          title={isPlaying ? 'Pause Auto-play' : 'Play moves sequentially'}
          aria-label="Auto-play moves"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={() => onSelectMove(Math.min(moves.length - 1, currentMoveIndex + 1))}
          disabled={currentMoveIndex >= moves.length - 1}
          className="py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 disabled:hover:text-zinc-400 flex items-center justify-center transition-all"
          title="Next Move (Right Arrow)"
          aria-label="Go to Next Move"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectMove(moves.length - 1)}
          disabled={currentMoveIndex === moves.length - 1 || moves.length === 0}
          className="py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 disabled:hover:text-zinc-400 flex items-center justify-center transition-all"
          title="Latest Position (End)"
          aria-label="Go to Latest Move"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Analysis Actions: Run Review, Presets, PGN */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={onRunReview}
          disabled={moves.length === 0 || isReviewing}
          className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all border border-blue-400/20"
        >
          <Sparkles className="w-4 h-4 text-blue-200" />
          {isReviewing
            ? 'Running Game Review...'
            : hasReviewReport
            ? 'View Game Review & Accuracy'
            : 'Run Full Game Review'}
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          {onUndoMove && (
            <button
              type="button"
              onClick={onUndoMove}
              disabled={!canUndo}
              className="py-1.5 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 disabled:opacity-40 disabled:hover:text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              title="Undo last move"
              aria-label="Undo Move"
            >
              <Undo2 className="w-3.5 h-3.5 text-blue-400" />
              Undo Move
            </button>
          )}
          {onOpenBoardEditor && (
            <button
              type="button"
              onClick={onOpenBoardEditor}
              className="py-1.5 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              title="Edit Board Position"
              aria-label="Edit Board"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              Edit Board
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={onOpenPresets}
            className="py-1.5 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            Presets
          </button>

          <button
            onClick={onOpenImportExport}
            className="py-1.5 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Share2 className="w-3.5 h-3.5 text-zinc-400" />
            PGN / FEN
          </button>

          <button
            onClick={onResetGame}
            className="py-1.5 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-rose-400 hover:border-rose-900/40 text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
