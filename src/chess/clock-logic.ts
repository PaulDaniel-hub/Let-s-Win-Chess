import { Chess } from 'chess.js';
import { ClockState, PieceColor, PieceType, TimeControlPreset } from '../types/chess';

export const TIME_CONTROL_PRESETS: TimeControlPreset[] = [
  { id: 'bullet-1-0', name: '1+0 Bullet', category: 'bullet', baseMinutes: 1, incrementSeconds: 0 },
  { id: 'bullet-2-1', name: '2+1 Bullet', category: 'bullet', baseMinutes: 2, incrementSeconds: 1 },
  { id: 'blitz-3-0', name: '3+0 Blitz', category: 'blitz', baseMinutes: 3, incrementSeconds: 0 },
  { id: 'blitz-3-2', name: '3+2 Blitz', category: 'blitz', baseMinutes: 3, incrementSeconds: 2 },
  { id: 'blitz-5-0', name: '5+0 Blitz', category: 'blitz', baseMinutes: 5, incrementSeconds: 0 },
  { id: 'blitz-5-3', name: '5+3 Blitz', category: 'blitz', baseMinutes: 5, incrementSeconds: 3 },
  { id: 'rapid-10-0', name: '10+0 Rapid', category: 'rapid', baseMinutes: 10, incrementSeconds: 0 },
  { id: 'rapid-15-10', name: '15+10 Rapid', category: 'rapid', baseMinutes: 15, incrementSeconds: 10 },
  { id: 'classical-30-0', name: '30+0 Classical', category: 'classical', baseMinutes: 30, incrementSeconds: 0 },
  { id: 'classical-60-30', name: '60+30 Classical', category: 'classical', baseMinutes: 60, incrementSeconds: 30 },
];

export function createInitialClockState(
  baseMinutes: number = 5,
  incrementSeconds: number = 3
): ClockState {
  const initialMs = Math.max(1, baseMinutes) * 60 * 1000;
  const incMs = Math.max(0, incrementSeconds) * 1000;
  return {
    whiteTimeMs: initialMs,
    blackTimeMs: initialMs,
    initialTimeMs: initialMs,
    incrementMs: incMs,
    activeSide: null,
    isRunning: false,
    flaggedSide: null,
    moveCount: 0,
  };
}

export function formatClockTime(ms: number): {
  formatted: string;
  isLowTime: boolean;
  isCritical: boolean;
  isFlagged: boolean;
} {
  if (ms <= 0) {
    return {
      formatted: '0:00',
      isLowTime: true,
      isCritical: true,
      isFlagged: true,
    };
  }

  const isCritical = ms < 10000; // < 10 seconds
  const isLowTime = ms < 30000; // < 30 seconds

  // When under 10 seconds, show seconds and tenths (e.g. 0:08.4)
  if (isCritical) {
    const totalSecs = ms / 1000;
    const wholeSecs = Math.floor(totalSecs);
    const tenths = Math.floor((ms % 1000) / 100);
    return {
      formatted: `0:0${wholeSecs}.${tenths}`.slice(-6),
      isLowTime: true,
      isCritical: true,
      isFlagged: false,
    };
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  if (hours > 0) {
    return {
      formatted: `${hours}:${pad(minutes)}:${pad(seconds)}`,
      isLowTime,
      isCritical: false,
      isFlagged: false,
    };
  }

  return {
    formatted: `${minutes}:${pad(seconds)}`,
    isLowTime,
    isCritical: false,
    isFlagged: false,
  };
}

/**
 * Ticks the active clock by deltaMs.
 */
export function tickClock(state: ClockState, deltaMs: number): ClockState {
  if (!state.isRunning || !state.activeSide || state.flaggedSide) {
    return state;
  }

  if (state.activeSide === 'w') {
    const remaining = state.whiteTimeMs - deltaMs;
    if (remaining <= 0) {
      return {
        ...state,
        whiteTimeMs: 0,
        isRunning: false,
        flaggedSide: 'w',
      };
    }
    return { ...state, whiteTimeMs: remaining };
  } else {
    const remaining = state.blackTimeMs - deltaMs;
    if (remaining <= 0) {
      return {
        ...state,
        blackTimeMs: 0,
        isRunning: false,
        flaggedSide: 'b',
      };
    }
    return { ...state, blackTimeMs: remaining };
  }
}

/**
 * Called when a move is completed:
 * Adds increment to the side that just moved and passes turn to nextSide.
 */
export function switchClockTurn(state: ClockState, nextSide: PieceColor): ClockState {
  if (state.flaggedSide) return state;

  const currentSide = nextSide === 'w' ? 'b' : 'w';
  let newWhiteTime = state.whiteTimeMs;
  let newBlackTime = state.blackTimeMs;

  // Add increment to the mover
  if (currentSide === 'w') {
    newWhiteTime += state.incrementMs;
  } else {
    newBlackTime += state.incrementMs;
  }

  return {
    ...state,
    whiteTimeMs: newWhiteTime,
    blackTimeMs: newBlackTime,
    activeSide: nextSide,
    isRunning: true,
    moveCount: state.moveCount + 1,
  };
}

/**
 * Adds bonus time to a player's clock (e.g. +15s like Lichess).
 */
export function addTimeToClock(state: ClockState, side: PieceColor, addedMs: number = 15000): ClockState {
  return {
    ...state,
    whiteTimeMs: side === 'w' ? state.whiteTimeMs + addedMs : state.whiteTimeMs,
    blackTimeMs: side === 'b' ? state.blackTimeMs + addedMs : state.blackTimeMs,
  };
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const STARTING_PIECES: Record<PieceType, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
  k: 1,
};

/**
 * Calculates captured pieces and material difference from a given FEN.
 */
export function calculateMaterialDifference(fen: string): {
  whiteMaterialScore: number;
  blackMaterialScore: number;
  whiteAdvantage: number; // positive = White leads, negative = Black leads
  capturedByWhite: PieceType[]; // Black pieces that White captured
  capturedByBlack: PieceType[]; // White pieces that Black captured
} {
  const currentWhite: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const currentBlack: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

  try {
    const chess = new Chess(fen);
    chess.board().forEach((row) => {
      row.forEach((sq) => {
        if (sq) {
          if (sq.color === 'w') {
            currentWhite[sq.type]++;
          } else {
            currentBlack[sq.type]++;
          }
        }
      });
    });
  } catch {
    // If invalid FEN, return empty
  }

  const capturedByWhite: PieceType[] = [];
  const capturedByBlack: PieceType[] = [];

  let whiteMaterialScore = 0;
  let blackMaterialScore = 0;

  (['q', 'r', 'b', 'n', 'p'] as PieceType[]).forEach((t) => {
    whiteMaterialScore += currentWhite[t] * PIECE_VALUES[t];
    blackMaterialScore += currentBlack[t] * PIECE_VALUES[t];

    const blackLost = Math.max(0, STARTING_PIECES[t] - currentBlack[t]);
    for (let i = 0; i < blackLost; i++) capturedByWhite.push(t);

    const whiteLost = Math.max(0, STARTING_PIECES[t] - currentWhite[t]);
    for (let i = 0; i < whiteLost; i++) capturedByBlack.push(t);
  });

  return {
    whiteMaterialScore,
    blackMaterialScore,
    whiteAdvantage: whiteMaterialScore - blackMaterialScore,
    capturedByWhite,
    capturedByBlack,
  };
}
