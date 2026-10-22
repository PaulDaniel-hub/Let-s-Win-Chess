import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  Award,
  TrendingUp,
  Info,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { GameReviewReport, MoveClassification, MoveHistoryItem } from '../types/chess';
import { formatEvaluation } from '../chess/chess-logic';

interface GameReviewModalProps {
  report: GameReviewReport;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMove: (moveIndex: number) => void;
}

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  report,
  isOpen,
  onClose,
  onNavigateToMove,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'chart' | 'moves'>('summary');
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    label: string;
    evalCp: number;
    move: string;
    classification?: MoveClassification;
    x: number;
    y: number;
  } | null>(null);

  if (!isOpen) return null;

  const classificationOrder: { key: MoveClassification; label: string; color: string; badge: string }[] = [
    { key: 'brilliant', label: 'Brilliant', color: 'text-teal-400 bg-teal-500/20 border-teal-500/30', badge: '!!' },
    { key: 'great', label: 'Great', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30', badge: '!' },
    { key: 'best', label: 'Best', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30', badge: '★' },
    { key: 'excellent', label: 'Excellent', color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/20', badge: '✓' },
    { key: 'good', label: 'Good', color: 'text-zinc-300 bg-zinc-700/30 border-zinc-700', badge: '–' },
    { key: 'inaccuracy', label: 'Inaccuracy', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30', badge: '?!' },
    { key: 'mistake', label: 'Mistake', color: 'text-orange-400 bg-orange-500/20 border-orange-500/30', badge: '?' },
    { key: 'blunder', label: 'Blunder', color: 'text-rose-400 bg-rose-500/20 border-rose-500/30', badge: '??' },
  ];

  // Prepare SVG chart points
  const graph = report.evaluationGraph;
  const chartWidth = 560;
  const chartHeight = 160;
  const paddingX = 20;
  const paddingY = 16;
  const innerW = chartWidth - paddingX * 2;
  const innerH = chartHeight - paddingY * 2;
  const midY = paddingY + innerH / 2;

  const points = graph.map((g, idx) => {
    const x = graph.length <= 1 ? paddingX + innerW / 2 : paddingX + (idx / (graph.length - 1)) * innerW;
    // Map evalCp (-600 to +600) to y
    const clampedCp = Math.max(-600, Math.min(600, g.evalCp));
    const normalized = clampedCp / 600; // -1 to +1
    const y = midY - normalized * (innerH / 2);
    return { ...g, x, y };
  });

  const pathD = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in"
      data-testid="game-review-modal"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Full Game Review & Accuracy</h2>
              <p className="text-xs text-zinc-400">Stockfish algorithmic move evaluation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Close Review Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-zinc-800/80 px-5 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2.5 border-b-2 transition-all ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Accuracy & Overview
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`py-2.5 border-b-2 transition-all ${
              activeTab === 'chart'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Evaluation Graph
          </button>
          <button
            onClick={() => setActiveTab('moves')}
            className={`py-2.5 border-b-2 transition-all ${
              activeTab === 'moves'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Move by Move Breakdown ({report.analyzedMoves.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {activeTab === 'summary' && (
            <>
              {/* Accuracy estimate headline cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* White Accuracy */}
                <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-900 border border-zinc-300">
                      W
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zinc-400">White Accuracy</div>
                      <div className="text-2xl font-black text-zinc-100 font-mono">
                        {report.whiteAccuracy}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-zinc-400">
                      ACPL: {report.averageCentipawnLoss.white}
                    </span>
                  </div>
                </div>

                {/* Black Accuracy */}
                <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center font-bold text-zinc-100 border border-zinc-700">
                      B
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zinc-400">Black Accuracy</div>
                      <div className="text-2xl font-black text-zinc-100 font-mono">
                        {report.blackAccuracy}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-zinc-400">
                      ACPL: {report.averageCentipawnLoss.black}
                    </span>
                  </div>
                </div>
              </div>

              {/* Explanatory Callout (Requirement: Accuracy estimates explained as estimates) */}
              <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded-xl flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200/90 leading-relaxed">
                  <strong className="text-blue-100">About Accuracy Estimates: </strong>
                  Accuracy percentages are mathematical estimates derived by comparing player moves against
                  Stockfish&apos;s principal evaluations using Average Centipawn Loss (ACPL) and Win Expectancy models.
                  They provide a relative benchmark rather than an absolute measure of play.
                </div>
              </div>

              {/* Move classification counts table */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Move Classifications
                </h4>
                <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_80px_80px] p-2.5 text-xs font-bold text-zinc-400 border-b border-zinc-800 bg-zinc-900/50">
                    <span>Category</span>
                    <span className="text-center">White</span>
                    <span className="text-center">Black</span>
                  </div>
                  {classificationOrder.map((item) => (
                    <div
                      key={item.key}
                      className="grid grid-cols-[1fr_80px_80px] px-3 py-2 text-xs items-center border-b border-zinc-800/40 hover:bg-zinc-800/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.color}`}>
                          {item.badge}
                        </span>
                        <span className="text-zinc-200 font-medium">{item.label}</span>
                      </div>
                      <span className="text-center font-mono font-bold text-zinc-300">
                        {report.whiteStats[item.key] || 0}
                      </span>
                      <span className="text-center font-mono font-bold text-zinc-300">
                        {report.blackStats[item.key] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'chart' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Evaluation graph across {graph.length} moves</span>
                <span>Click any point to inspect position on board</span>
              </div>

              {/* Interactive SVG Chart */}
              <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl p-3 overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-auto select-none"
                >
                  <defs>
                    <linearGradient id="whiteAdvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Advantage regions labels */}
                  <text x="12" y="16" fill="#94a3b8" fontSize="9" fontWeight="600">
                    +White
                  </text>
                  <text x="12" y={chartHeight - 6} fill="#94a3b8" fontSize="9" fontWeight="600">
                    +Black
                  </text>

                  {/* Center zero line */}
                  <line
                    x1={paddingX}
                    y1={midY}
                    x2={chartWidth - paddingX}
                    y2={midY}
                    stroke="#3f3f46"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />

                  {/* Advantage evaluation curve */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* Interactive points */}
                  {points.map((p, idx) => {
                    const isHovered = hoveredPoint?.index === idx;
                    let dotColor = '#38bdf8';
                    let r = 3;
                    if (p.classification === 'blunder') {
                      dotColor = '#f43f5e';
                      r = 4.5;
                    } else if (p.classification === 'mistake') {
                      dotColor = '#fb923c';
                      r = 4;
                    } else if (p.classification === 'brilliant') {
                      dotColor = '#2dd4bf';
                      r = 4.5;
                    }

                    return (
                      <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? r + 2.5 : r}
                        fill={dotColor}
                        stroke="#09090b"
                        strokeWidth="1.5"
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredPoint({ ...p, index: idx })}
                        onClick={() => {
                          onNavigateToMove(p.moveIndex);
                          onClose();
                        }}
                      />
                    );
                  })}
                </svg>

                {/* Hover Tooltip */}
                {hoveredPoint && (
                  <div
                    className="absolute z-20 pointer-events-none bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs px-2.5 py-1.5 rounded-lg shadow-xl -translate-x-1/2 -translate-y-full mb-2"
                    style={{
                      left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                      top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                    }}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{hoveredPoint.moveLabel}</span>
                      <span className="font-mono text-blue-400">
                        {formatEvaluation(hoveredPoint.evalCp)}
                      </span>
                    </div>
                    {hoveredPoint.classification && (
                      <div className="capitalize text-[10px] text-zinc-400">
                        {hoveredPoint.classification}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'moves' && (
            <div className="flex flex-col gap-2">
              {report.analyzedMoves.map((m) => {
                const isSignificant =
                  m.classification === 'blunder' ||
                  m.classification === 'mistake' ||
                  m.classification === 'inaccuracy' ||
                  m.classification === 'brilliant';

                return (
                  <div
                    key={m.index}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                      m.classification === 'blunder'
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : m.classification === 'mistake'
                        ? 'bg-orange-950/20 border-orange-500/30'
                        : m.classification === 'brilliant'
                        ? 'bg-teal-950/20 border-teal-500/30'
                        : 'bg-zinc-950/40 border-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-zinc-400 w-12">
                        {m.moveNumber}{m.color === 'w' ? '.' : '...'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-zinc-100">
                          {m.san}
                        </span>
                        {m.classification && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                              m.classification === 'blunder'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : m.classification === 'mistake'
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : m.classification === 'inaccuracy'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : m.classification === 'brilliant'
                                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {m.classification}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                      {m.bestAlternativeSan && isSignificant && (
                        <div className="text-[11px] text-zinc-400 font-mono">
                          Best was:{' '}
                          <span className="text-emerald-400 font-bold">
                            {m.bestAlternativeSan}
                          </span>
                        </div>
                      )}

                      <span className="font-mono font-bold text-zinc-300">
                        {formatEvaluation(m.evalScoreCp, m.evalMate)}
                      </span>

                      <button
                        onClick={() => {
                          onNavigateToMove(m.index);
                          onClose();
                        }}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        Inspect
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
};
