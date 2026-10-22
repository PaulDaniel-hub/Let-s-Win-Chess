import { Chess } from 'chess.js';
import { MoveAnalysis, MoveClassification, Square } from '../types/chess';

/**
 * Parses a Stockfish UCI "info" output line.
 * Example line:
 * "info depth 14 seldepth 20 multipv 1 score cp 32 nodes 12345 nps 300000 time 41 pv e2e4 e7e5 g1f3"
 * "info depth 8 score mate 2 pv d1h5 g7g6 h5e5"
 */
export function parseUciInfoLine(line: string): Partial<MoveAnalysis> | null {
  if (!line.startsWith('info') || !line.includes('score')) {
    return null;
  }

  const tokens = line.trim().split(/\s+/);
  const result: Partial<MoveAnalysis> = {
    multipv: 1,
    pvUci: [],
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === 'depth' && i + 1 < tokens.length) {
      result.depth = parseInt(tokens[i + 1], 10);
    } else if (token === 'multipv' && i + 1 < tokens.length) {
      result.multipv = parseInt(tokens[i + 1], 10);
    } else if (token === 'score' && i + 2 < tokens.length) {
      const scoreType = tokens[i + 1];
      const scoreVal = parseInt(tokens[i + 2], 10);
      if (scoreType === 'cp') {
        result.scoreCp = scoreVal;
      } else if (scoreType === 'mate') {
        result.mate = scoreVal;
      }
    } else if (token === 'nodes' && i + 1 < tokens.length) {
      result.nodes = parseInt(tokens[i + 1], 10);
    } else if (token === 'nps' && i + 1 < tokens.length) {
      result.nps = parseInt(tokens[i + 1], 10);
    } else if (token === 'pv') {
      result.pvUci = tokens.slice(i + 1);
      break; // PV is always the last token list in the line
    }
  }

  if (result.pvUci && result.pvUci.length > 0) {
    result.bestMoveUci = result.pvUci[0];
  }

  return result;
}

/**
 * Converts a single UCI move (e.g. "e2e4", "e7e8q") to SAN (e.g. "e4", "e8=Q") for a given FEN.
 */
export function uciToSan(fen: string, uciMove: string): { san: string; uci: string; from: Square; to: Square } | null {
  if (!uciMove || uciMove.length < 4) return null;
  try {
    const chess = new Chess(fen);
    const from = uciMove.slice(0, 2) as Square;
    const to = uciMove.slice(2, 4) as Square;
    const promotion = uciMove.length === 5 ? uciMove[4] : undefined;

    const move = chess.move({
      from,
      to,
      promotion: promotion ? (promotion.toLowerCase() as 'q' | 'r' | 'b' | 'n') : undefined,
    });

    if (!move) return null;
    return {
      san: move.san,
      uci: uciMove,
      from,
      to,
    };
  } catch {
    return null;
  }
}

/**
 * Converts an entire array of UCI moves in a PV into SAN notation step by step.
 */
export function pvUciToSanList(fen: string, pvUci: string[], maxMoves: number = 8): string[] {
  const result: string[] = [];
  try {
    const chess = new Chess(fen);
    for (let i = 0; i < Math.min(pvUci.length, maxMoves); i++) {
      const uci = pvUci[i];
      if (uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length === 5 ? uci[4] : undefined;

      const move = chess.move({
        from,
        to,
        promotion: promotion ? (promotion.toLowerCase() as 'q' | 'r' | 'b' | 'n') : undefined,
      });

      if (!move) break;
      result.push(move.san);
    }
  } catch {
    // If any illegal position arises, return what we have
  }
  return result;
}

/**
 * Calculates win percentage based on centipawn score.
 * Formula used by Lichess: Win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
 * Score is from White's perspective.
 */
export function calculateWinPercentage(cp: number): number {
  if (isNaN(cp)) return 50;
  // Cap cp to prevent numerical overflow
  const clampedCp = Math.max(-2000, Math.min(2000, cp));
  const win = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clampedCp)) - 1);
  return Math.max(0, Math.min(100, Math.round(win * 10) / 10));
}

/**
 * Normalizes score to centipawns, handling mate scores gracefully.
 * Mate in 1 is ~ 10,000 cp, Mate in 2 is ~ 9,900 cp, etc.
 */
export function scoreToCp(scoreCp?: number, mate?: number): number {
  if (mate !== undefined && mate !== null) {
    if (mate === 0) return 0;
    const sign = mate > 0 ? 1 : -1;
    return sign * Math.max(1000, 10000 - Math.abs(mate) * 100);
  }
  return scoreCp ?? 0;
}

/**
 * Classifies a move based on centipawn loss and win probability change.
 */
export function classifyMove(
  evalBeforeCp: number,
  evalAfterCp: number,
  isWhiteMove: boolean,
  isBestMoveUciMatch: boolean,
  isPieceSacrifice: boolean = false
): {
  classification: MoveClassification;
  centipawnLoss: number;
  winProbDelta: number;
} {
  // Evaluation from the perspective of the side that just moved
  const moverEvalBefore = isWhiteMove ? evalBeforeCp : -evalBeforeCp;
  const moverEvalAfter = isWhiteMove ? evalAfterCp : -evalAfterCp;

  const winBefore = calculateWinPercentage(moverEvalBefore);
  const winAfter = calculateWinPercentage(moverEvalAfter);

  const centipawnLoss = Math.max(0, moverEvalBefore - moverEvalAfter);
  const winProbDelta = Math.max(0, winBefore - winAfter);

  // If this was the engine's top choice
  if (isBestMoveUciMatch) {
    if (isPieceSacrifice && winAfter >= 60) {
      return { classification: 'brilliant', centipawnLoss, winProbDelta };
    }
    return { classification: 'best', centipawnLoss, winProbDelta };
  }

  // Brilliant move heuristic: sacrifice of material leading to winning advantage
  if (isPieceSacrifice && moverEvalAfter >= 150 && centipawnLoss <= 25) {
    return { classification: 'brilliant', centipawnLoss, winProbDelta };
  }

  // Classification by Win Probability Drop and CP Loss
  if (winProbDelta <= 1.5 && centipawnLoss <= 20) {
    return { classification: 'excellent', centipawnLoss, winProbDelta };
  }
  if (winProbDelta <= 3.5 && centipawnLoss <= 50) {
    return { classification: 'good', centipawnLoss, winProbDelta };
  }
  if (winProbDelta <= 7.0 || centipawnLoss <= 110) {
    return { classification: 'inaccuracy', centipawnLoss, winProbDelta };
  }
  if (winProbDelta <= 18.0 || centipawnLoss <= 240) {
    return { classification: 'mistake', centipawnLoss, winProbDelta };
  }

  return { classification: 'blunder', centipawnLoss, winProbDelta };
}

/**
 * Calculates estimated accuracy percentage based on average centipawn loss (ACPL).
 * Uses exponential curve model commonly used in chess analysis tools.
 * Returns a value between 0 and 100.
 */
export function calculateAccuracyFromLosses(losses: number[]): number {
  if (losses.length === 0) return 100;
  const acpl = losses.reduce((sum, v) => sum + v, 0) / losses.length;
  // Formula: Accuracy = 103.1668 * exp(-0.04354 * (acpl / 10)) - 3.1669
  const accuracy = 103.1668 * Math.exp(-0.04354 * (acpl / 10)) - 3.1669;
  return Math.max(10, Math.min(99.8, Math.round(accuracy * 10) / 10));
}

/**
 * Formats evaluation score for display (e.g. +1.4, -0.6, 0.0, M2, -M1).
 * Always from White's perspective unless explicitly requested.
 */
export function formatEvaluation(scoreCp?: number, mate?: number): string {
  if (mate !== undefined && mate !== null) {
    return mate > 0 ? `+M${mate}` : `-M${Math.abs(mate)}`;
  }
  if (scoreCp === undefined || scoreCp === null) {
    return '0.0';
  }
  const scoreInPawns = (scoreCp / 100).toFixed(1);
  if (scoreCp > 0) {
    return `+${scoreInPawns}`;
  }
  if (scoreCp === 0) {
    return '0.0';
  }
  return scoreInPawns;
}

/**
 * Converts evaluation to a height percentage (0% to 100%) for White's portion of the eval gauge.
 * 50% means dead equal (0.00).
 * 100% means White is totally winning (+10.0 or +M).
 * 0% means Black is totally winning (-10.0 or -M).
 */
export function getEvalBarPercentage(scoreCp?: number, mate?: number): number {
  if (mate !== undefined && mate !== null) {
    return mate > 0 ? 98 : 2;
  }
  if (scoreCp === undefined || scoreCp === null) {
    return 50;
  }
  // Clamp centipawns between -1000 and +1000
  const clamped = Math.max(-1000, Math.min(1000, scoreCp));
  // Use a smooth sigmoid curve
  const winRate = calculateWinPercentage(clamped);
  return Math.max(3, Math.min(97, winRate));
}

/**
 * Generates initial FEN string.
 */
export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
