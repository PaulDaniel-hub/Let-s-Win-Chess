import React, { useState, useEffect, useMemo } from 'react';
import {
  CastlingRights,
  DEFAULT_CASTLING_RIGHTS,
  EditorPiece,
  boardToFen,
  createEmptyGrid,
  fenToBoard,
  validateCustomPosition,
} from '../chess/board-editor-logic';
import { STARTING_FEN } from '../chess/chess-logic';
import { ChessPieceSvg } from '../chess/piece-svgs';
import { PieceColor, PieceType } from '../types/chess';
import {
  X,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  MousePointer,
  Sparkles,
} from 'lucide-react';

interface BoardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFen: string;
  onApplyFen: (fen: string) => void;
}

const PIECE_TYPES: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p'];
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const BoardEditorModal: React.FC<BoardEditorModalProps> = ({
  isOpen,
  onClose,
  initialFen,
  onApplyFen,
}) => {
  const [grid, setGrid] = useState<(EditorPiece | null)[][]>(() => createEmptyGrid());
  const [turn, setTurn] = useState<PieceColor>('w');
  const [castling, setCastling] = useState<CastlingRights>(DEFAULT_CASTLING_RIGHTS);

  // Selected tool: either a piece to place, 'erase', or null (move mode)
  const [selectedPiece, setSelectedPiece] = useState<EditorPiece | null>({
    type: 'p',
    color: 'w',
  });
  const [isEraserActive, setIsEraserActive] = useState(false);
  const [draggedFromSquare, setDraggedFromSquare] = useState<{ r: number; c: number } | null>(null);

  // Initialize board from initialFen whenever opened
  useEffect(() => {
    if (isOpen) {
      try {
        const parsed = fenToBoard(initialFen || STARTING_FEN);
        setGrid(parsed.grid);
        setTurn(parsed.turn);
        setCastling(parsed.castling);
      } catch {
        const parsed = fenToBoard(STARTING_FEN);
        setGrid(parsed.grid);
        setTurn(parsed.turn);
        setCastling(parsed.castling);
      }
      setIsEraserActive(false);
      setSelectedPiece({ type: 'p', color: 'w' });
    }
  }, [isOpen, initialFen]);

  // Real-time validation
  const validation = useMemo(() => {
    return validateCustomPosition(grid, turn, castling);
  }, [grid, turn, castling]);

  if (!isOpen) return null;

  // Square click handling
  const handleSquareClick = (r: number, c: number) => {
    // If eraser active, delete piece
    if (isEraserActive) {
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = null;
        return next;
      });
      return;
    }

    // If a piece is selected from palette, place it
    if (selectedPiece) {
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = { ...selectedPiece };
        return next;
      });
      return;
    }

    // If pointer mode: pick up / place
    if (draggedFromSquare) {
      if (draggedFromSquare.r === r && draggedFromSquare.c === c) {
        setDraggedFromSquare(null);
        return;
      }
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        const pieceToMove = next[draggedFromSquare.r][draggedFromSquare.c];
        next[draggedFromSquare.r][draggedFromSquare.c] = null;
        next[r][c] = pieceToMove;
        return next;
      });
      setDraggedFromSquare(null);
    } else if (grid[r][c]) {
      setDraggedFromSquare({ r, c });
    }
  };

  // Right click to quickly delete piece
  const handleContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = null;
      return next;
    });
  };

  // Reset to standard starting position
  const handleResetToStarting = () => {
    const parsed = fenToBoard(STARTING_FEN);
    setGrid(parsed.grid);
    setTurn(parsed.turn);
    setCastling(parsed.castling);
  };

  // Clear all pieces
  const handleClearBoard = () => {
    setGrid(createEmptyGrid());
    setCastling({
      whiteKingside: false,
      whiteQueenside: false,
      blackKingside: false,
      blackQueenside: false,
    });
  };

  // Apply position
  const handleApply = () => {
    if (validation.isValid && validation.fen) {
      onApplyFen(validation.fen);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-title"
    >
      <div className="bg-[#181a20] border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#15171c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="editor-title" className="text-base sm:text-lg font-bold text-white">
                Edit Board Position
              </h2>
              <p className="text-xs text-zinc-400">
                Place, move, or remove pieces to set up any custom chess position.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
          {/* Left Column: Board + Palette */}
          <div className="flex flex-col items-center gap-3">
            {/* Black Piece Palette */}
            <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800 shadow-inner">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                Black:
              </span>
              {PIECE_TYPES.map((type) => {
                const isSel = !isEraserActive && selectedPiece?.type === type && selectedPiece.color === 'b';
                return (
                  <button
                    key={`b-${type}`}
                    onClick={() => {
                      setSelectedPiece({ type, color: 'b' });
                      setIsEraserActive(false);
                      setDraggedFromSquare(null);
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg p-1 transition-all flex items-center justify-center ${
                      isSel
                        ? 'bg-blue-600/30 border-2 border-blue-400 ring-2 ring-blue-500/30 scale-105'
                        : 'bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60'
                    }`}
                    title={`Place Black ${type.toUpperCase()}`}
                    aria-label={`Place Black ${type.toUpperCase()}`}
                  >
                    <div className="w-7 h-7">
                      <ChessPieceSvg type={type} color="b" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 8x8 Editor Board */}
            <div className="relative aspect-square w-full max-w-[340px] sm:max-w-[400px] rounded-lg shadow-2xl overflow-hidden border border-zinc-800 bg-[#2b2b2b] select-none">
              <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                {RANKS.map((rank, r) =>
                  FILES.map((file, c) => {
                    const isLightSquare = (r + c) % 2 === 0;
                    const piece = grid[r][c];
                    const isDragged = draggedFromSquare?.r === r && draggedFromSquare?.c === c;

                    return (
                      <div
                        key={`${file}${rank}`}
                        onClick={() => handleSquareClick(r, c)}
                        onContextMenu={(e) => handleContextMenu(e, r, c)}
                        className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                          isLightSquare ? 'bg-[#dee3e6]' : 'bg-[#8ca2ad]'
                        } ${isDragged ? '!bg-amber-400/70 ring-2 ring-amber-400' : ''} hover:brightness-105`}
                        title={`${file}${rank} (Right-click to erase)`}
                        data-editor-square={`${file}${rank}`}
                      >
                        {/* Corner coordinates */}
                        {c === 0 && (
                          <span
                            className={`absolute top-0.5 left-1 text-[9px] font-bold pointer-events-none ${
                              isLightSquare ? 'text-[#8ca2ad]' : 'text-[#dee3e6]'
                            }`}
                          >
                            {rank}
                          </span>
                        )}
                        {r === 7 && (
                          <span
                            className={`absolute bottom-0.5 right-1 text-[9px] font-bold pointer-events-none ${
                              isLightSquare ? 'text-[#8ca2ad]' : 'text-[#dee3e6]'
                            }`}
                          >
                            {file}
                          </span>
                        )}

                        {piece && (
                          <div className="w-[82%] h-[82%] pointer-events-none">
                            <ChessPieceSvg type={piece.type} color={piece.color} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* White Piece Palette */}
            <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800 shadow-inner">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                White:
              </span>
              {PIECE_TYPES.map((type) => {
                const isSel = !isEraserActive && selectedPiece?.type === type && selectedPiece.color === 'w';
                return (
                  <button
                    key={`w-${type}`}
                    onClick={() => {
                      setSelectedPiece({ type, color: 'w' });
                      setIsEraserActive(false);
                      setDraggedFromSquare(null);
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg p-1 transition-all flex items-center justify-center ${
                      isSel
                        ? 'bg-blue-600/30 border-2 border-blue-400 ring-2 ring-blue-500/30 scale-105'
                        : 'bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60'
                    }`}
                    title={`Place White ${type.toUpperCase()}`}
                    aria-label={`Place White ${type.toUpperCase()}`}
                  >
                    <div className="w-7 h-7">
                      <ChessPieceSvg type={type} color="w" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tool Selection: Pointer (Move) & Eraser */}
            <div className="flex items-center gap-2 w-full justify-center">
              <button
                onClick={() => {
                  setSelectedPiece(null);
                  setIsEraserActive(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  !isEraserActive && selectedPiece === null
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                    : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                <MousePointer className="w-3.5 h-3.5" />
                Select / Move Piece
              </button>

              <button
                onClick={() => {
                  setIsEraserActive(true);
                  setSelectedPiece(null);
                  setDraggedFromSquare(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  isEraserActive
                    ? 'bg-rose-600/20 text-rose-300 border-rose-500/40'
                    : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eraser
              </button>
            </div>
          </div>

          {/* Right Column: Settings & Actions */}
          <div className="flex flex-col gap-4 w-full">
            {/* Quick Presets */}
            <div className="bg-zinc-900/80 rounded-xl p-3.5 border border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Quick Setup
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleResetToStarting}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                  Starting Position
                </button>
                <button
                  onClick={handleClearBoard}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Clear Board
                </button>
              </div>
            </div>

            {/* Turn To Move */}
            <div className="bg-zinc-900/80 rounded-xl p-3.5 border border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Side To Move
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTurn('w')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    turn === 'w'
                      ? 'bg-zinc-100 text-zinc-900 border-white shadow-md'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-white border border-zinc-400 inline-block" />
                  White to move
                </button>
                <button
                  type="button"
                  onClick={() => setTurn('b')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    turn === 'b'
                      ? 'bg-zinc-950 text-white border-zinc-600 shadow-md ring-1 ring-zinc-500'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-zinc-950 border border-zinc-600 inline-block" />
                  Black to move
                </button>
              </div>
            </div>

            {/* Castling Availability */}
            <div className="bg-zinc-900/80 rounded-xl p-3.5 border border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Castling Rights
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer hover:text-white p-1.5 rounded bg-zinc-850">
                  <input
                    type="checkbox"
                    checked={castling.whiteKingside}
                    onChange={(e) =>
                      setCastling((prev) => ({ ...prev, whiteKingside: e.target.checked }))
                    }
                    className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 bg-zinc-800"
                  />
                  <span>White O-O (Kingside)</span>
                </label>
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer hover:text-white p-1.5 rounded bg-zinc-850">
                  <input
                    type="checkbox"
                    checked={castling.whiteQueenside}
                    onChange={(e) =>
                      setCastling((prev) => ({ ...prev, whiteQueenside: e.target.checked }))
                    }
                    className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 bg-zinc-800"
                  />
                  <span>White O-O-O (Queenside)</span>
                </label>
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer hover:text-white p-1.5 rounded bg-zinc-850">
                  <input
                    type="checkbox"
                    checked={castling.blackKingside}
                    onChange={(e) =>
                      setCastling((prev) => ({ ...prev, blackKingside: e.target.checked }))
                    }
                    className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 bg-zinc-800"
                  />
                  <span>Black O-O (Kingside)</span>
                </label>
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer hover:text-white p-1.5 rounded bg-zinc-850">
                  <input
                    type="checkbox"
                    checked={castling.blackQueenside}
                    onChange={(e) =>
                      setCastling((prev) => ({ ...prev, blackQueenside: e.target.checked }))
                    }
                    className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 bg-zinc-800"
                  />
                  <span>Black O-O-O (Queenside)</span>
                </label>
              </div>
            </div>

            {/* Validation Feedback & FEN preview */}
            <div
              className={`p-3.5 rounded-xl border text-xs flex flex-col gap-1.5 transition-all ${
                validation.isValid
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {validation.isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{validation.message}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{validation.message}</span>
                  </>
                )}
              </div>
              {validation.isValid && validation.fen && (
                <div className="font-mono text-[10px] break-all bg-black/40 p-1.5 rounded text-zinc-300 select-all">
                  {validation.fen}
                </div>
              )}
            </div>

            {/* Apply & Cancel Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!validation.isValid}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-900/30 transition-all border border-blue-400/30"
              >
                <Play className="w-3.5 h-3.5" />
                Apply & Start Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
