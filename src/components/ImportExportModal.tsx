import React, { useState } from 'react';
import { X, Copy, Check, Upload, FileText } from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFen: string;
  currentPgn: string;
  onImportFen: (fen: string) => boolean;
  onImportPgn: (pgn: string) => boolean;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  currentFen,
  currentPgn,
  onImportFen,
  onImportPgn,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [inputPgn, setInputPgn] = useState('');
  const [inputFen, setInputFen] = useState('');
  const [copiedFen, setCopiedFen] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyFen = () => {
    navigator.clipboard.writeText(currentFen);
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(currentPgn || '1. e4');
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  const handleApplyFen = () => {
    setErrorMessage(null);
    if (!inputFen.trim()) return;
    const ok = onImportFen(inputFen.trim());
    if (ok) {
      onClose();
    } else {
      setErrorMessage('Invalid FEN position string. Please verify standard chess notation.');
    }
  };

  const handleApplyPgn = () => {
    setErrorMessage(null);
    if (!inputPgn.trim()) return;
    const ok = onImportPgn(inputPgn.trim());
    if (ok) {
      onClose();
    } else {
      setErrorMessage('Could not parse PGN. Please verify standard PGN format.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
      data-testid="import-export-modal"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">FEN & PGN Data</h2>
              <p className="text-xs text-zinc-400">Export or import game positions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Close Import/Export Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 px-5 gap-4 text-xs font-semibold">
          <button
            onClick={() => setTab('export')}
            className={`py-2.5 border-b-2 transition-all ${
              tab === 'export'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Export Current Board
          </button>
          <button
            onClick={() => setTab('import')}
            className={`py-2.5 border-b-2 transition-all ${
              tab === 'import'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Import Custom FEN / PGN
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          {tab === 'export' ? (
            <>
              {/* FEN Export */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                  <span>Current FEN</span>
                  <button
                    onClick={handleCopyFen}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[11px]"
                  >
                    {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFen ? 'Copied FEN!' : 'Copy FEN'}
                  </button>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300 break-all select-all">
                  {currentFen}
                </div>
              </div>

              {/* PGN Export */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                  <span>Game PGN</span>
                  <button
                    onClick={handleCopyPgn}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[11px]"
                  >
                    {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPgn ? 'Copied PGN!' : 'Copy PGN'}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={6}
                  value={currentPgn || 'No moves played yet.'}
                  className="w-full p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300 resize-none focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              {/* Import FEN */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-300">
                  Paste FEN Position
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputFen}
                    onChange={(e) => setInputFen(e.target.value)}
                    placeholder="e.g. rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleApplyFen}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Load FEN
                  </button>
                </div>
              </div>

              {/* Import PGN */}
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                <label className="text-xs font-semibold text-zinc-300">
                  Paste Game PGN
                </label>
                <textarea
                  rows={5}
                  value={inputPgn}
                  onChange={(e) => setInputPgn(e.target.value)}
                  placeholder="Paste complete PGN here (e.g. 1. e4 e5 2. Nf3 Nc6...)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs font-mono text-zinc-200 resize-none focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleApplyPgn}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Load PGN Game
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
