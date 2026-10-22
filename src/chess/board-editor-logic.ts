import { Chess, Square as ChessJsSquare } from 'chess.js';
import { PieceColor, PieceType, Square } from '../types/chess';

export interface EditorPiece {
  type: PieceType;
  color: PieceColor;
}

export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

export const DEFAULT_CASTLING_RIGHTS: CastlingRights = {
  whiteKingside: true,
  whiteQueenside: true,
  blackKingside: true,
  blackQueenside: true,
};

/**
 * Converts an 8x8 editor grid (row 0 = rank 8, row 7 = rank 1) to a FEN string.
 */
export function boardToFen(
  grid: (EditorPiece | null)[][],
  turn: PieceColor,
  castling: CastlingRights
): string {
  const ranks: string[] = [];

  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    let rankStr = '';

    for (let c = 0; c < 8; c++) {
      const piece = grid[r][c];
      if (!piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rankStr += emptyCount.toString();
          emptyCount = 0;
        }
        const char = piece.type === 'n' ? 'n' : piece.type;
        rankStr += piece.color === 'w' ? char.toUpperCase() : char.toLowerCase();
      }
    }

    if (emptyCount > 0) {
      rankStr += emptyCount.toString();
    }

    ranks.push(rankStr);
  }

  // Castling string
  let castlingStr = '';
  if (castling.whiteKingside) castlingStr += 'K';
  if (castling.whiteQueenside) castlingStr += 'Q';
  if (castling.blackKingside) castlingStr += 'k';
  if (castling.blackQueenside) castlingStr += 'q';
  if (!castlingStr) castlingStr = '-';

  return `${ranks.join('/')} ${turn} ${castlingStr} - 0 1`;
}

/**
 * Converts a standard FEN string into an 8x8 grid of EditorPieces.
 */
export function fenToBoard(fen: string): {
  grid: (EditorPiece | null)[][];
  turn: PieceColor;
  castling: CastlingRights;
} {
  const parts = fen.trim().split(/\s+/);
  const placement = parts[0] || '';
  const turn = (parts[1] === 'b' ? 'b' : 'w') as PieceColor;
  const castlingStr = parts[2] || '-';

  const grid: (EditorPiece | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  const rankRows = placement.split('/');
  for (let r = 0; r < Math.min(8, rankRows.length); r++) {
    const rowStr = rankRows[r];
    let col = 0;
    for (let i = 0; i < rowStr.length && col < 8; i++) {
      const char = rowStr[i];
      if (char >= '1' && char <= '8') {
        col += parseInt(char, 10);
      } else {
        const isWhite = char === char.toUpperCase();
        const type = char.toLowerCase() as PieceType;
        grid[r][col] = { type, color: isWhite ? 'w' : 'b' };
        col++;
      }
    }
  }

  const castling: CastlingRights = {
    whiteKingside: castlingStr.includes('K'),
    whiteQueenside: castlingStr.includes('Q'),
    blackKingside: castlingStr.includes('k'),
    blackQueenside: castlingStr.includes('q'),
  };

  return { grid, turn, castling };
}

/**
 * Creates an empty 8x8 board grid.
 */
export function createEmptyGrid(): (EditorPiece | null)[][] {
  return Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
}

/**
 * Validates a custom board position before setting it as the active game.
 */
export function validateCustomPosition(
  grid: (EditorPiece | null)[][],
  turn: PieceColor,
  castling: CastlingRights
): { isValid: boolean; message: string; fen?: string } {
  let whiteKings = 0;
  let blackKings = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = grid[r][c];
      if (p) {
        if (p.type === 'k') {
          if (p.color === 'w') whiteKings++;
          else blackKings++;
        }
        // Pawns cannot be on the 1st (r=7) or 8th (r=0) rank
        if (p.type === 'p' && (r === 0 || r === 7)) {
          return {
            isValid: false,
            message: 'Pawns cannot be placed on the 1st or 8th rank.',
          };
        }
      }
    }
  }

  if (whiteKings === 0) {
    return { isValid: false, message: 'Position must have a White King.' };
  }
  if (whiteKings > 1) {
    return { isValid: false, message: 'Position cannot have more than one White King.' };
  }
  if (blackKings === 0) {
    return { isValid: false, message: 'Position must have a Black King.' };
  }
  if (blackKings > 1) {
    return { isValid: false, message: 'Position cannot have more than one Black King.' };
  }

  // Generate FEN and test with chess.js
  const generatedFen = boardToFen(grid, turn, castling);
  try {
    const testGame = new Chess(generatedFen);
    // Ensure opposite king is not in check
    const oppTurn = turn === 'w' ? 'b' : 'w';
    const oppFen = boardToFen(grid, oppTurn, castling);
    const oppGame = new Chess(oppFen);
    // If the non-active player is in check, the position is impossible
    if (oppGame.inCheck()) {
      return {
        isValid: false,
        message: 'The side whose turn it is not cannot be in check.',
      };
    }

    return { isValid: true, message: 'Valid position ready to analyze.', fen: generatedFen };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Invalid chess position layout.';
    return { isValid: false, message: errMsg };
  }
}

/**
 * Calculates how many moves to undo:
 * In a game against the engine, when it's the player's turn, we undo 2 moves (both engine reply and player move).
 * If history has only 1 move or it's free analysis, we undo 1 move.
 */
export function calculateUndoStepCount(
  historyLength: number,
  isVsEngine: boolean,
  playerColor: PieceColor,
  currentTurn: PieceColor
): number {
  if (historyLength <= 0) return 0;
  if (!isVsEngine) return 1;

  // In vs engine mode:
  // If it is currently the player's turn, the engine has already replied.
  // We want to undo both the engine's reply and the player's original move so the player can re-try.
  if (currentTurn === playerColor) {
    return historyLength >= 2 ? 2 : 1;
  }

  // If it's currently the engine's turn (e.g. engine is still thinking), take back 1 move
  return 1;
}
