import React from 'react';
import { EngineEvaluationState } from '../types/chess';
import { formatEvaluation, getEvalBarPercentage } from '../chess/chess-logic';

interface EvalGaugeProps {
  evaluation: EngineEvaluationState | null;
  flip: boolean;
}

export const EvalGauge: React.FC<EvalGaugeProps> = ({ evaluation, flip }) => {
  const topPv = evaluation?.multiPvLines?.[0];
  const scoreCp = topPv?.scoreCp;
  const mate = topPv?.mate;
  const depth = evaluation?.depth || 0;
  const isApproximate = evaluation?.isApproximate ?? true;
  const source = evaluation?.source || 'local-stockfish';

  // Percentage of the bar that represents White
  const whitePercent = getEvalBarPercentage(scoreCp, mate);
  // If flipped, invert bar visual
  const displayWhitePercent = flip ? 100 - whitePercent : whitePercent;

  const scoreText = formatEvaluation(scoreCp, mate);

  return (
    <div
      className="relative flex flex-col items-center justify-between w-9 sm:w-10 h-full rounded-md overflow-hidden bg-zinc-950 border border-zinc-800 shadow-inner select-none"
      title={`Evaluation: ${scoreText} (Depth ${depth})`}
      data-testid="eval-gauge"
    >
      {/* Black's section (Top if not flipped) */}
      <div
        className="w-full bg-zinc-900 transition-all duration-300 ease-out relative flex items-start justify-center pt-1"
        style={{ height: `${100 - displayWhitePercent}%` }}
      >
        {displayWhitePercent < 50 && (
          <span className="text-[11px] font-mono font-bold text-zinc-300 px-0.5">
            {scoreText}
          </span>
        )}
      </div>

      {/* Center divider line */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-blue-500/30 z-10 pointer-events-none" />

      {/* White's section (Bottom if not flipped) */}
      <div
        className="w-full bg-zinc-100 transition-all duration-300 ease-out relative flex items-end justify-center pb-1 shadow-[0_-2px_10px_rgba(255,255,255,0.1)]"
        style={{ height: `${displayWhitePercent}%` }}
      >
        {displayWhitePercent >= 50 && (
          <span className="text-[11px] font-mono font-bold text-zinc-900 px-0.5">
            {scoreText}
          </span>
        )}
      </div>

      {/* Subdued depth badge on bottom */}
      <div
        className={`absolute bottom-0 inset-x-0 text-center py-0.5 text-[8px] font-mono font-semibold z-20 pointer-events-none ${
          displayWhitePercent > 20 ? 'text-zinc-700 bg-white/70' : 'text-zinc-400 bg-zinc-900/80'
        }`}
      >
        {source === 'cloud-master' ? 'GM' : `d${depth}`}
      </div>
    </div>
  );
};
