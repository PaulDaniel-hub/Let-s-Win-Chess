import React from 'react';
import {
  Activity,
  Cpu,
  Layers,
  Zap,
  Sliders,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  EngineConfig,
  EngineEvaluationState,
  EngineStrength,
  MoveAnalysis,
} from '../types/chess';
import { formatEvaluation } from '../chess/chess-logic';

interface EnginePanelProps {
  config: EngineConfig;
  evaluation: EngineEvaluationState | null;
  onConfigChange: (newConfig: Partial<EngineConfig>) => void;
  onPreviewPvMove?: (moves: string[]) => void;
  isEngineActive: boolean;
  onToggleEngine: () => void;
}

const STRENGTH_PRESETS: {
  id: EngineStrength;
  label: string;
  elo: string;
  skill: number;
  depth: number;
}[] = [
  { id: 'beginner', label: 'Beginner', elo: '~800 ELO', skill: 3, depth: 8 },
  { id: 'casual', label: 'Casual', elo: '~1300 ELO', skill: 8, depth: 10 },
  { id: 'club', label: 'Club', elo: '~1800 ELO', skill: 14, depth: 14 },
  { id: 'master', label: 'Master', elo: '~2400 ELO', skill: 18, depth: 18 },
  { id: 'max', label: 'Stockfish Max', elo: '3500+ ELO', skill: 20, depth: 22 },
];

export const EnginePanel: React.FC<EnginePanelProps> = ({
  config,
  evaluation,
  onConfigChange,
  onPreviewPvMove,
  isEngineActive,
  onToggleEngine,
}) => {
  const currentStrength = STRENGTH_PRESETS.find((s) => s.id === config.strength) || STRENGTH_PRESETS[4];
  const depth = evaluation?.depth || 0;
  const nodes = evaluation?.nodes || 0;
  const nps = evaluation?.nps || 0;
  const isApproximate = evaluation?.isApproximate ?? config.isApproximateMode;
  const source = evaluation?.source || 'local-stockfish';
  const pvLines = evaluation?.multiPvLines || [];

  return (
    <div
      className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 shadow-xl backdrop-blur-md"
      data-testid="engine-panel"
    >
      {/* Engine Header & Quick Switch */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isEngineActive ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20' : 'bg-zinc-600'
            }`}
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 font-sans">
              Stockfish Engine
              {source === 'cloud-master' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
                  Cloud Master GM
                </span>
              )}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              {isEngineActive
                ? `Depth: ${depth} / ${config.isApproximateMode ? '10 (approx)' : config.targetDepth} • ${(nodes / 1000).toFixed(0)}k nodes`
                : 'Engine paused'}
            </span>
          </div>
        </div>

        {/* Toggle Analysis switch */}
        <button
          onClick={onToggleEngine}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            isEngineActive
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
          }`}
          aria-label={isEngineActive ? 'Pause Engine Analysis' : 'Start Engine Analysis'}
        >
          <Cpu className="w-3.5 h-3.5" />
          {isEngineActive ? 'Analyzing' : 'Start Engine'}
        </button>
      </div>

      {/* Analysis Mode: Approximate vs Deep Strong Analysis (Requirement) */}
      <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/70 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            Analysis Precision
          </span>
          {isApproximate ? (
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
              ⚡ Fast Approximate
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
              🔬 Strong Deep Analysis
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
          <button
            onClick={() => onConfigChange({ isApproximateMode: true, targetDepth: 10 })}
            className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              config.isApproximateMode
                ? 'bg-zinc-800 text-amber-300 shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            Fast Approximate
          </button>
          <button
            onClick={() => onConfigChange({ isApproximateMode: false, targetDepth: currentStrength.depth })}
            className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              !config.isApproximateMode
                ? 'bg-blue-600/30 text-blue-300 shadow-sm border border-blue-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            Strong Deep
          </button>
        </div>

        <p className="text-[11px] text-zinc-400/90 leading-tight">
          {config.isApproximateMode
            ? 'Approximate mode: Rapid low-depth analysis (d8-10) for instant responsive feedback.'
            : 'Deep mode: Full depth Stockfish evaluation (d18-22+) with complete tactical calculation.'}
        </p>
      </div>

      {/* Engine Strength & Multi-PV Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Engine Strength Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            Engine Strength
          </label>
          <select
            value={config.strength}
            onChange={(e) => {
              const val = e.target.value as EngineStrength;
              const preset = STRENGTH_PRESETS.find((p) => p.id === val);
              if (preset) {
                onConfigChange({
                  strength: val,
                  skillLevel: preset.skill,
                  targetDepth: config.isApproximateMode ? 10 : preset.depth,
                });
              }
            }}
            className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-500"
            aria-label="Engine Strength"
          >
            {STRENGTH_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.elo})
              </option>
            ))}
          </select>
        </div>

        {/* Multi-PV Selector (1, 2, or 3 Lines) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            Recommended Lines (Multi-PV)
          </label>
          <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => onConfigChange({ multiPv: num })}
                className={`py-1 text-xs font-medium rounded transition-all ${
                  config.multiPv === num
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                aria-label={`Show ${num} engine recommendation line${num > 1 ? 's' : ''}`}
              >
                {num} {num === 1 ? 'Line' : 'Lines'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Lines Table with Multi-color Arrows Legend */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
          <span>Engine Candidate Moves</span>
          <span className="text-[11px] text-zinc-500 font-mono">
            {nps > 0 ? `${(nps / 1000).toFixed(0)} kN/s` : ''}
          </span>
        </div>

        {pvLines.length === 0 ? (
          <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-4 text-center text-xs text-zinc-500">
            Calculating best moves...
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {pvLines.slice(0, config.multiPv).map((line, idx) => {
              const scoreText = formatEvaluation(line.scoreCp, line.mate);
              const colorInfo =
                idx === 0
                  ? {
                      bg: 'bg-emerald-500/15',
                      border: 'border-emerald-500/30',
                      badge: 'bg-emerald-500 text-zinc-950',
                      text: 'text-emerald-400',
                      label: 'Best Move',
                    }
                  : idx === 1
                  ? {
                      bg: 'bg-cyan-500/15',
                      border: 'border-cyan-500/30',
                      badge: 'bg-cyan-500 text-zinc-950',
                      text: 'text-cyan-400',
                      label: 'Alternative 2',
                    }
                  : {
                      bg: 'bg-amber-500/15',
                      border: 'border-amber-500/30',
                      badge: 'bg-amber-500 text-zinc-950',
                      text: 'text-amber-400',
                      label: 'Alternative 3',
                    };

              return (
                <div
                  key={line.multipv}
                  className={`p-2.5 rounded-lg border ${colorInfo.border} ${colorInfo.bg} flex flex-col gap-1.5 transition-all hover:border-blue-500/50`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colorInfo.badge}`}>
                        #{line.multipv} {colorInfo.label}
                      </span>
                      <span className="font-mono font-bold text-sm text-zinc-100">
                        {line.bestMoveSan}
                      </span>
                    </div>
                    <span className={`font-mono text-xs font-bold ${colorInfo.text}`}>
                      {scoreText}
                    </span>
                  </div>

                  {/* Variation Continuation Line */}
                  {line.pvSan && line.pvSan.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[11px] text-zinc-400 font-mono">
                      <span className="text-zinc-500">PV:</span>
                      {line.pvSan.slice(0, 7).map((move, mIdx) => (
                        <span
                          key={mIdx}
                          className="hover:text-blue-300 hover:underline cursor-pointer bg-zinc-900/60 px-1 py-0.5 rounded border border-zinc-800/40"
                          onClick={() => onPreviewPvMove?.(line.pvUci)}
                          title="Click to preview variation"
                        >
                          {move}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
