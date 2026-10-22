export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type Square =
  | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8'
  | 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8'
  | 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c7' | 'c8'
  | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8'
  | 'e1' | 'e2' | 'e3' | 'e4' | 'e5' | 'e6' | 'e7' | 'e8'
  | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8'
  | 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'g7' | 'g8'
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'h7' | 'h8';

export interface MoveAnalysis {
  multipv: number;
  depth: number;
  scoreCp?: number;
  mate?: number;
  nodes?: number;
  nps?: number;
  pvUci: string[]; // ['e2e4', 'e7e5', ...]
  pvSan: string[]; // ['e4', 'e5', ...]
  bestMoveUci: string; // 'e2e4'
  bestMoveSan: string; // 'e4'
}

export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'book';

export interface MoveHistoryItem {
  index: number; // 0-based
  moveNumber: number; // 1, 2, 3...
  color: PieceColor;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  captured?: PieceType;
  promotion?: PieceType;
  check?: boolean;
  checkmate?: boolean;
  classification?: MoveClassification;
  evalScoreCp?: number; // Score from White perspective
  evalMate?: number;
  centipawnLoss?: number;
  bestAlternativeSan?: string;
  bestAlternativeUci?: string;
  comment?: string;
}

export type EngineStrength = 'beginner' | 'casual' | 'club' | 'master' | 'max';

export interface EngineConfig {
  strength: EngineStrength;
  skillLevel: number; // 0 to 20
  targetDepth: number; // 8 to 25
  multiPv: number; // 1 to 3
  isApproximateMode: boolean; // Fast approximate vs Deep analysis
  threads: number;
}

export interface EngineEvaluationState {
  isAnalyzing: boolean;
  depth: number;
  maxDepth: number;
  nodes: number;
  nps: number;
  multiPvLines: MoveAnalysis[];
  isApproximate: boolean; // true if shallow/fast, false if deep/confirmed
  source: 'local-stockfish' | 'cloud-master';
}

export interface GameReviewReport {
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteStats: Record<MoveClassification, number>;
  blackStats: Record<MoveClassification, number>;
  averageCentipawnLoss: {
    white: number;
    black: number;
  };
  analyzedMoves: MoveHistoryItem[];
  evaluationGraph: {
    moveIndex: number;
    moveLabel: string;
    evalCp: number;
    isMate: boolean;
    mateIn?: number;
    playedMove: string;
    classification?: MoveClassification;
  }[];
}

export interface ArrowDefinition {
  from: Square;
  to: Square;
  color: string;
  opacity?: number;
  label?: string;
  type?: 'best' | 'alternative-1' | 'alternative-2' | 'threat';
}

export type TimeControlCategory = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'custom';

export interface TimeControlPreset {
  id: string;
  name: string;
  category: TimeControlCategory;
  baseMinutes: number;
  incrementSeconds: number;
}

export interface ClockState {
  whiteTimeMs: number;
  blackTimeMs: number;
  initialTimeMs: number;
  incrementMs: number;
  activeSide: PieceColor | null;
  isRunning: boolean;
  flaggedSide: PieceColor | null;
  moveCount: number;
}

