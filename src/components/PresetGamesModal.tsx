import React from 'react';
import { X, BookOpen, ChevronRight, Trophy } from 'lucide-react';
import { PRESET_GAMES, PresetGame } from '../chess/preset-games';

interface PresetGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (game: PresetGame) => void;
}

export const PresetGamesModal: React.FC<PresetGamesModalProps> = ({
  isOpen,
  onClose,
  onSelectGame,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
      data-testid="preset-games-modal"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Master & Classic Games</h2>
              <p className="text-xs text-zinc-400">Load famous positions for instant analysis</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Close Presets Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of preset games */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {PRESET_GAMES.map((game) => (
            <div
              key={game.id}
              onClick={() => {
                onSelectGame(game);
                onClose();
              }}
              className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-blue-500/50 hover:bg-zinc-800/40 cursor-pointer transition-all flex flex-col gap-2 group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 group-hover:text-blue-300 transition-colors">
                    {game.title}
                  </h3>
                  <div className="text-xs text-zinc-400">
                    {game.white} vs {game.black} ({game.result}, {game.year})
                  </div>
                </div>
                <span className="p-1 rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-blue-400 group-hover:bg-blue-600/20 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>

              <p className="text-xs text-zinc-400/90 leading-relaxed">
                {game.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
