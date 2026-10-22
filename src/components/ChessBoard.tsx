import React, { useState, useRef } from 'react';
import { Chess, Square as ChessJsSquare } from 'chess.js';
import { ArrowDefinition, PieceColor, PieceType, Square } from '../types/chess';
import { ChessPieceSvg } from '../chess/piece-svgs';
import { playChessSound } from '../chess/sound';

interface ChessBoardProps {
  fen: string;
  flip: boolean;
  arrows: ArrowDefinition[];
  lastMove?: { from: Square; to: Square } | null;
  onMove: (from: Square, to: Square, promotion?: PieceType) => void;
  isInteractive?: boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  flip,
  arrows,
  lastMove,
  onMove,
  isInteractive = true,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  // Parse position
  const chess = React.useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const board = chess.board();
  const isCheck = chess.inCheck();
  const turn = chess.turn();

  // Find King square if in check
  let checkSquare: Square | null = null;
  if (isCheck) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          checkSquare = `${FILES[c]}${RANKS[r]}` as Square;
        }
      }
    }
  }

  // Legal moves for selected square
  const legalMovesForSelected = React.useMemo(() => {
    if (!selectedSquare) return [];
    try {
      return chess.moves({ square: selectedSquare as ChessJsSquare, verbose: true });
    } catch {
      return [];
    }
  }, [chess, selectedSquare]);

  const legalTargetSquares = React.useMemo(() => {
    const map = new Map<Square, { isCapture: boolean; isPromotion: boolean }>();
    legalMovesForSelected.forEach((m) => {
      map.set(m.to as Square, {
        isCapture: Boolean(m.captured),
        isPromotion: Boolean(m.promotion),
      });
    });
    return map;
  }, [legalMovesForSelected]);

  // Handle square click
  const handleSquareClick = (square: Square) => {
    if (!isInteractive || pendingPromotion) return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        // Deselect
        setSelectedSquare(null);
        return;
      }

      // Check if target is a legal move
      const targetMove = legalTargetSquares.get(square);
      if (targetMove) {
        // Is promotion?
        const fromPiece = chess.get(selectedSquare as ChessJsSquare);
        const isWhitePawnPromo = fromPiece?.type === 'p' && fromPiece.color === 'w' && square.endsWith('8');
        const isBlackPawnPromo = fromPiece?.type === 'p' && fromPiece.color === 'b' && square.endsWith('1');

        if (isWhitePawnPromo || isBlackPawnPromo) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        // Execute regular move
        executeMove(selectedSquare, square);
        setSelectedSquare(null);
        return;
      }

      // If clicked another piece of same color, select it instead
      const clickedPiece = chess.get(square as ChessJsSquare);
      if (clickedPiece && clickedPiece.color === turn) {
        setSelectedSquare(square);
        return;
      }

      // Invalid target, deselect
      setSelectedSquare(null);
    } else {
      // Select piece if it belongs to active turn
      const clickedPiece = chess.get(square as ChessJsSquare);
      if (clickedPiece && clickedPiece.color === turn) {
        setSelectedSquare(square);
      }
    }
  };

  const executeMove = (from: Square, to: Square, promotion?: PieceType) => {
    try {
      const move = chess.move({
        from: from as ChessJsSquare,
        to: to as ChessJsSquare,
        promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      });

      if (move) {
        if (chess.isGameOver()) {
          playChessSound('gameEnd');
        } else if (chess.inCheck()) {
          playChessSound('check');
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
          playChessSound('castle');
        } else if (move.captured) {
          playChessSound('capture');
        } else {
          playChessSound('move');
        }
        onMove(from, to, promotion);
      }
    } catch (e) {
      console.warn('Illegal move attempted:', e);
    }
  };

  const handlePromotionSelect = (promoPiece: PieceType) => {
    if (pendingPromotion) {
      executeMove(pendingPromotion.from, pendingPromotion.to, promoPiece);
      setPendingPromotion(null);
      setSelectedSquare(null);
    }
  };

  // Coordinates mapping
  const displayFiles = flip ? [...FILES].reverse() : FILES;
  const displayRanks = flip ? [...RANKS].reverse() : RANKS;

  // Convert square like "e4" to (col, row) coordinates (0-7, 0-7)
  const getSquareCoordinates = (sq: Square): { x: number; y: number } => {
    const file = sq[0];
    const rank = sq[1];
    const colIdx = displayFiles.indexOf(file);
    const rowIdx = displayRanks.indexOf(rank);
    return {
      x: colIdx * 12.5 + 6.25, // percentage center
      y: rowIdx * 12.5 + 6.25,
    };
  };

  return (
    <div
      className="relative aspect-square w-full max-w-[620px] rounded-lg shadow-2xl overflow-hidden select-none border border-zinc-800/80 bg-[#2b2b2b]"
      data-testid="chess-board"
    >
      {/* 8x8 Board Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {displayRanks.map((rank, rowIdx) =>
          displayFiles.map((file, colIdx) => {
            const squareName = `${file}${rank}` as Square;
            const isLightSquare = (colIdx + rowIdx) % 2 === 0;
            const piece = chess.get(squareName as ChessJsSquare);

            const isSelected = selectedSquare === squareName;
            const isTarget = legalTargetSquares.has(squareName);
            const targetDetails = legalTargetSquares.get(squareName);
            const isLastMoveFrom = lastMove?.from === squareName;
            const isLastMoveTo = lastMove?.to === squareName;
            const isKingInCheck = checkSquare === squareName;

            return (
              <div
                key={squareName}
                onClick={() => handleSquareClick(squareName)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                  isLightSquare
                    ? 'bg-[#dee3e6] text-zinc-600'
                    : 'bg-[#8ca2ad] text-zinc-800'
                } ${
                  isSelected
                    ? '!bg-amber-400/70 ring-2 ring-amber-400 inset-0'
                    : ''
                } ${
                  isLastMoveFrom || isLastMoveTo
                    ? '!bg-amber-300/40'
                    : ''
                } ${
                  isKingInCheck
                    ? '!bg-red-500/80 ring-4 ring-red-600 animate-pulse'
                    : ''
                }`}
                data-square={squareName}
              >
                {/* Board Rank & File Labels (Lichess corner style) */}
                {colIdx === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] font-bold pointer-events-none select-none ${
                      isLightSquare ? 'text-[#8ca2ad]' : 'text-[#dee3e6]'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {rowIdx === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] font-bold pointer-events-none select-none ${
                      isLightSquare ? 'text-[#8ca2ad]' : 'text-[#dee3e6]'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Target legal move markers */}
                {isTarget && !piece && (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-zinc-900/35 pointer-events-none transform active:scale-125 transition-transform" />
                )}
                {isTarget && piece && (
                  <div className="absolute inset-0.5 border-4 border-zinc-900/30 rounded-full pointer-events-none" />
                )}

                {/* Chess Piece Graphic */}
                {piece && (
                  <div
                    className={`w-[84%] h-[84%] transition-transform duration-100 ${
                      isSelected ? 'scale-105 filter drop-shadow-md' : 'hover:scale-102'
                    }`}
                  >
                    <ChessPieceSvg
                      type={piece.type as PieceType}
                      color={piece.color as PieceColor}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SVG Layer for Recommended Move Arrows */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox="0 0 100 100"
      >
        <defs>
          {/* Arrow markers for different ranks/categories */}
          <marker
            id="arrowhead-best"
            markerWidth="4"
            markerHeight="4"
            refX="2.5"
            refY="2"
            orient="auto"
          >
            <path d="M 0 0 L 4 2 L 0 4 z" fill="#10b981" />
          </marker>
          <marker
            id="arrowhead-alt1"
            markerWidth="4"
            markerHeight="4"
            refX="2.5"
            refY="2"
            orient="auto"
          >
            <path d="M 0 0 L 4 2 L 0 4 z" fill="#06b6d4" />
          </marker>
          <marker
            id="arrowhead-alt2"
            markerWidth="4"
            markerHeight="4"
            refX="2.5"
            refY="2"
            orient="auto"
          >
            <path d="M 0 0 L 4 2 L 0 4 z" fill="#f59e0b" />
          </marker>
          <marker
            id="arrowhead-threat"
            markerWidth="4"
            markerHeight="4"
            refX="2.5"
            refY="2"
            orient="auto"
          >
            <path d="M 0 0 L 4 2 L 0 4 z" fill="#f43f5e" />
          </marker>
        </defs>

        {arrows.map((arr, idx) => {
          const fromCoord = getSquareCoordinates(arr.from);
          const toCoord = getSquareCoordinates(arr.to);

          // Shorten line slightly so arrow head sits right in square center
          const dx = toCoord.x - fromCoord.x;
          const dy = toCoord.y - fromCoord.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) return null;

          // Shorten target by ~3.5%
          const shorten = 3.2;
          const endX = toCoord.x - (dx / len) * shorten;
          const endY = toCoord.y - (dy / len) * shorten;

          let markerId = 'arrowhead-best';
          let strokeWidth = 2.4;
          let strokeColor = arr.color;

          if (arr.type === 'alternative-1') {
            markerId = 'arrowhead-alt1';
            strokeWidth = 2.0;
          } else if (arr.type === 'alternative-2') {
            markerId = 'arrowhead-alt2';
            strokeWidth = 1.7;
          } else if (arr.type === 'threat') {
            markerId = 'arrowhead-threat';
            strokeWidth = 2.2;
          }

          return (
            <g key={`${arr.from}-${arr.to}-${idx}`}>
              {/* Subtle background glow for readability against any board square */}
              <line
                x1={`${fromCoord.x}%`}
                y1={`${fromCoord.y}%`}
                x2={`${endX}%`}
                y2={`${endY}%`}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={strokeWidth + 1.2}
                strokeLinecap="round"
              />
              <line
                x1={`${fromCoord.x}%`}
                y1={`${fromCoord.y}%`}
                x2={`${endX}%`}
                y2={`${endY}%`}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={arr.opacity || 0.85}
                markerEnd={`url(#${markerId})`}
              />
              {arr.label && (
                <circle
                  cx={`${(fromCoord.x + toCoord.x) / 2}%`}
                  cy={`${(fromCoord.y + toCoord.y) / 2}%`}
                  r="2.2"
                  fill="#18181b"
                  stroke={strokeColor}
                  strokeWidth="0.6"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Pawn Promotion Modal Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl flex flex-col items-center gap-3 animate-in fade-in zoom-in-95">
            <h4 className="text-sm font-semibold text-zinc-200">Select Promotion Piece</h4>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as PieceType[]).map((pType) => (
                <button
                  key={pType}
                  onClick={() => handlePromotionSelect(pType)}
                  className="w-14 h-14 bg-zinc-800 hover:bg-zinc-700 hover:border-blue-500 border border-zinc-700 rounded-lg p-2 transition-all flex items-center justify-center shadow"
                  aria-label={`Promote to ${pType.toUpperCase()}`}
                >
                  <ChessPieceSvg type={pType} color={turn} />
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setPendingPromotion(null);
                setSelectedSquare(null);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-200 mt-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
