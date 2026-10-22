import React, { useState } from 'react';
import { X, Clock, Play, RotateCcw, Check, Sparkles } from 'lucide-react';
import { TimeControlCategory, TimeControlPreset } from '../types/chess';
import { TIME_CONTROL_PRESETS } from '../chess/clock-logic';

interface ClockConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPresetId: string;
  onSelectPreset: (preset: TimeControlPreset) => void;
  onCustomTimeControl: (baseMinutes: number, incrementSeconds: number) => void;
  onResetClock: () => void;
  isRunning: boolean;
  onToggleClock: () => void;
}

export const ClockConfigModal: React.FC<ClockConfigModalProps> = ({
  isOpen,
  onClose,
  currentPresetId,
  onSelectPreset,
  onCustomTimeControl,
  onResetClock,
  isRunning,
  onToggleClock,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TimeControlCategory>('blitz');
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(5);

  if (!isOpen) return null;

  const categories: { id: TimeControlCategory; label: string; desc: string }[] = [
    { id: 'bullet', label: 'Bullet', desc: '1-2 mins' },
    { id: 'blitz', label: 'Blitz', desc: '3-5 mins' },
    { id: 'rapid', label: 'Rapid', desc: '10-15 mins' },
    { id: 'classical', label: 'Classical', desc: '30-60 mins' },
    { id: 'custom', label: 'Custom', desc: 'Set your own' },
  ];

  const presetsForCategory = TIME_CONTROL_PRESETS.filter(
    (p) => p.category === selectedCategory
  );

  const handleApplyCustom = () => {
    onCustomTimeControl(customMinutes, customIncrement);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
      data-testid="clock-config-modal"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Tournament Clocks</h2>
              <p className="text-xs text-zinc-400">Simulate FIDE and Online Tournament Conditions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Close Clock Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="grid grid-cols-5 p-2 gap-1 bg-zinc-950/80 border-b border-zinc-800/80 text-xs font-semibold">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center transition-all ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[9px] ${selectedCategory === cat.id ? 'text-blue-200' : 'text-zinc-500'}`}>
                {cat.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Time Control Options */}
        <div className="p-5 flex flex-col gap-4">
          {selectedCategory !== 'custom' ? (
            <div className="grid grid-cols-2 gap-2.5">
              {presetsForCategory.map((preset) => {
                const isSelected = currentPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-zinc-100">{preset.name}</div>
                      <div className="text-[11px] text-zinc-400">
                        {preset.baseMinutes} min + {preset.incrementSeconds}s increment
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300 flex justify-between">
                  <span>Base Minutes</span>
                  <span className="font-mono text-blue-400">{customMinutes} min</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="120"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(parseInt(e.target.value, 10))}
                  className="accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300 flex justify-between">
                  <span>Increment Seconds</span>
                  <span className="font-mono text-blue-400">+{customIncrement}s</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={customIncrement}
                  onChange={(e) => setCustomIncrement(parseInt(e.target.value, 10))}
                  className="accent-blue-500 cursor-pointer"
                />
              </div>

              <button
                onClick={handleApplyCustom}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors mt-2"
              >
                Apply Custom {customMinutes}+{customIncrement}
              </button>
            </div>
          )}

          {/* Quick Actions (Pause/Resume, Reset Clock) */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
            <button
              onClick={onToggleClock}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                isRunning
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              {isRunning ? 'Pause Clock' : 'Start / Resume Clock'}
            </button>

            <button
              onClick={() => {
                onResetClock();
                onClose();
              }}
              className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Clocks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
