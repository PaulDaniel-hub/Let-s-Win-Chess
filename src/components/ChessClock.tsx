import React from 'react';
import { Plus, AlertCircle, Clock } from 'lucide-react';
import { PieceColor, PieceType } from '../types/chess';
import { formatClockTime } from '../chess/clock-logic';
import { ChessPieceSvg } from '../chess/piece-svgs';

interface ChessClockProps {
  side: PieceColor;
  timeMs: number;
  isActive: boolean;
  isFlagged: boolean;
  playerName: string;
  capturedPieces: PieceType[];
  materialAdvantage: number;
  onAddBonusTime?: () => void;
  orientation?: 'top' | 'bottom';
}

export const ChessClock: React.FC<ChessClockProps> = ({
  side,
  timeMs,
  isActive,
  isFlagged,
  playerName,
  capturedPieces,
  materialAdvantage,
  onAddBonusTime,
  orientation = 'bottom',
}) => {
  const isWhite = side === 'w';
  const { formatted, isLowTime, isCritical } = formatClockTime(timeMs);

  // Group captured pieces by type for clean display (e.g. ♟♟♟ ♞)
  const pieceCounts: Record<PieceType, number> = {
    p: 0,
    n: 0,
    b: 0,
    r: 0,
    q: 0,
    k: 0,
  };
  capturedPieces.forEach((p) => {
    pieceCounts[p] = (pieceCounts[p] || 0) + 1;
  });

  return (
    <div
      className={`w-full max-w-[600px] flex items-center justify-between px-3 py-1.5 rounded-lg transition-all ${
        isActive
          ? 'bg-zinc-800/80 border border-blue-500/50 shadow-md shadow-blue-950/20'
          : 'bg-zinc-900/60 border border-zinc-800/60'
      }`}
      data-testid={`chess-clock-${side}`}
    >
      {/* Player info & captured pieces */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Color badge */}
        <div
          className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
            isWhite
              ? 'bg-zinc-100 border-zinc-300 shadow-sm'
              : 'bg-zinc-900 border-zinc-700 shadow-sm'
          }`}
        />

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-200 truncate">
              {playerName}
            </span>
            {isFlagged && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                FLAGGED
              </span>
            )}
          </div>

          {/* Captured pieces display & Material score */}
          <div className="flex items-center gap-1 h-4 text-xs font-mono text-zinc-400">
            {/* Captured icons */}
            <div className="flex items-center -space-x-1">
              {(['q', 'r', 'b', 'n', 'p'] as PieceType[]).map((pType) => {
                const count = pieceCounts[pType];
                if (!count) return null;
                return (
                  <div key={pType} className="flex items-center text-[10px]">
                    <span className="w-3.5 h-3.5 inline-block opacity-75">
                      <ChessPieceSvg
                        type={pType}
                        color={isWhite ? 'b' : 'w'} // Shows enemy pieces captured
                      />
                    </span>
                    {count > 1 && (
                      <span className="text-[9px] text-zinc-400 font-mono pl-0.5">
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Material point advantage (+1, +3, etc.) */}
            {materialAdvantage > 0 && (
              <span className="text-[10px] font-bold text-emerald-400 pl-1 font-mono">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clock Digital Display & Quick Action */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Lichess style +15s button */}
        {onAddBonusTime && (
          <button
            onClick={onAddBonusTime}
            className="p-1 rounded bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 text-[10px] flex items-center transition-colors"
            title="Add +15 seconds"
            aria-label={`Add 15 seconds to ${isWhite ? 'White' : 'Black'}`}
          >
            <Plus className="w-3 h-3" />
            <span className="text-[9px] font-mono">15s</span>
          </button>
        )}

        {/* Tournament Digital Clock Box */}
        <div
          className={`px-3 py-1 rounded-md font-mono text-base sm:text-lg font-black tracking-tight min-w-[76px] sm:min-w-[88px] text-right transition-all select-none border ${
            isFlagged
              ? 'bg-rose-950/80 text-rose-300 border-rose-500/80 animate-pulse'
              : isCritical
              ? 'bg-rose-950/40 text-rose-400 border-rose-500/60 animate-pulse'
              : isLowTime
              ? 'bg-amber-950/40 text-amber-300 border-amber-500/50'
              : isActive
              ? 'bg-zinc-950 text-blue-300 border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
              : 'bg-zinc-950 text-zinc-300 border-zinc-800'
          }`}
          data-testid={`clock-digits-${side}`}
        >
          {formatted}
        </div>
      </div>
    </div>
  );
};
