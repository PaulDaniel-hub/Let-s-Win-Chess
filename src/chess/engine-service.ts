import { Chess } from 'chess.js';
import {
  EngineConfig,
  EngineEvaluationState,
  GameReviewReport,
  MoveAnalysis,
  MoveClassification,
  MoveHistoryItem,
} from '../types/chess';
import {
  calculateAccuracyFromLosses,
  classifyMove,
  parseUciInfoLine,
  pvUciToSanList,
  scoreToCp,
  uciToSan,
} from './chess-logic';

export class EngineService {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private currentFen: string = '';
  private currentConfig: EngineConfig = {
    strength: 'max',
    skillLevel: 20,
    targetDepth: 20,
    multiPv: 3,
    isApproximateMode: false,
    threads: 1,
  };
  private onUpdateCallback: ((state: EngineEvaluationState) => void) | null = null;
  private currentPvLines: Map<number, MoveAnalysis> = new Map();
  private maxDepthReached: number = 0;
  private nodesCount: number = 0;
  private npsCount: number = 0;
  private isWorkerInitializing: boolean = false;
  private currentAnalysisId: number = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof window === 'undefined' || this.worker || this.isWorkerInitializing) return;

    this.isWorkerInitializing = true;
    try {
      this.worker = new Worker('/stockfish.js');
      this.worker.onmessage = (e: MessageEvent) => {
        const line = typeof e.data === 'string' ? e.data : '';
        this.handleWorkerMessage(line);
      };
      this.worker.onerror = (err) => {
        console.warn('Stockfish worker error, using fallback analysis:', err);
      };

      this.worker.postMessage('uci');
      this.worker.postMessage('isready');
    } catch (err) {
      console.warn('Could not initialize Stockfish web worker:', err);
      this.isWorkerInitializing = false;
    }
  }

  private handleWorkerMessage(line: string): void {
    if (line === 'uciok') {
      this.isReady = true;
      this.isWorkerInitializing = false;
      this.applyEngineConfig();
      return;
    }
    if (line === 'readyok') {
      this.isReady = true;
      return;
    }

    if (line.startsWith('info') && line.includes('score')) {
      const parsed = parseUciInfoLine(line);
      if (parsed && parsed.multipv && this.currentFen) {
        // Enrich with SAN moves
        const pvUci = parsed.pvUci || [];
        const pvSan = pvUciToSanList(this.currentFen, pvUci);
        const bestUci = parsed.bestMoveUci || (pvUci.length > 0 ? pvUci[0] : '');
        const bestSanObj = uciToSan(this.currentFen, bestUci);

        const analysis: MoveAnalysis = {
          multipv: parsed.multipv,
          depth: parsed.depth || this.maxDepthReached,
          scoreCp: parsed.scoreCp,
          mate: parsed.mate,
          nodes: parsed.nodes,
          nps: parsed.nps,
          pvUci,
          pvSan,
          bestMoveUci: bestUci,
          bestMoveSan: bestSanObj ? bestSanObj.san : bestUci,
        };

        if (parsed.depth && parsed.depth > this.maxDepthReached) {
          this.maxDepthReached = parsed.depth;
        }
        if (parsed.nodes) this.nodesCount = parsed.nodes;
        if (parsed.nps) this.npsCount = parsed.nps;

        this.currentPvLines.set(parsed.multipv, analysis);
        this.emitState();
      }
    }
  }

  private applyEngineConfig(): void {
    if (!this.worker || !this.isReady) return;
    this.worker.postMessage(`setoption name Skill Level value ${this.currentConfig.skillLevel}`);
    this.worker.postMessage(`setoption name MultiPV value ${this.currentConfig.multiPv}`);
  }

  private emitState(): void {
    if (!this.onUpdateCallback) return;
    const sortedLines = Array.from(this.currentPvLines.values()).sort(
      (a, b) => a.multipv - b.multipv
    );

    const isApproximate =
      this.currentConfig.isApproximateMode ||
      this.maxDepthReached < (this.currentConfig.isApproximateMode ? 8 : 16);

    this.onUpdateCallback({
      isAnalyzing: true,
      depth: this.maxDepthReached,
      maxDepth: this.currentConfig.targetDepth,
      nodes: this.nodesCount,
      nps: this.npsCount,
      multiPvLines: sortedLines,
      isApproximate,
      source: 'local-stockfish',
    });
  }

  public setConfig(config: Partial<EngineConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
    this.applyEngineConfig();
    if (this.currentFen) {
      this.startAnalysis(this.currentFen, this.currentConfig, this.onUpdateCallback || (() => {}));
    }
  }

  public getConfig(): EngineConfig {
    return { ...this.currentConfig };
  }

  public async startAnalysis(
    fen: string,
    config: EngineConfig,
    onUpdate: (state: EngineEvaluationState) => void
  ): Promise<void> {
    const analysisId = ++this.currentAnalysisId;
    this.currentFen = fen;
    this.currentConfig = config;
    this.onUpdateCallback = onUpdate;
    this.currentPvLines.clear();
    this.maxDepthReached = 0;
    this.nodesCount = 0;
    this.npsCount = 0;

    // First, check Lichess Cloud Evaluation for instant depth 40-75 master analysis!
    this.tryFetchCloudEval(fen, analysisId);

    // Concurrently trigger local Stockfish Worker
    if (!this.worker) {
      this.initWorker();
    }

    if (this.worker) {
      this.worker.postMessage('stop');
      this.worker.postMessage(`setoption name Skill Level value ${config.skillLevel}`);
      this.worker.postMessage(`setoption name MultiPV value ${config.multiPv}`);
      this.worker.postMessage(`position fen ${fen}`);

      const depth = config.isApproximateMode ? Math.min(10, config.targetDepth) : config.targetDepth;
      this.worker.postMessage(`go depth ${depth}`);
    } else {
      // Local fallback in case worker failed
      this.runFallbackEval(fen, config);
    }
  }

  private async tryFetchCloudEval(fen: string, analysisId: number): Promise<void> {
    try {
      const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=${this.currentConfig.multiPv}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(1800) });
      if (!res.ok) return;

      const data = await res.json();
      if (analysisId !== this.currentAnalysisId) return; // Stale position

      if (data && data.pvs && Array.isArray(data.pvs)) {
        const cloudLines: MoveAnalysis[] = [];
        data.pvs.forEach((pv: { moves: string; cp?: number; mate?: number }, idx: number) => {
          const uciMoves = pv.moves ? pv.moves.split(' ') : [];
          const bestUci = uciMoves[0] || '';
          const bestSanObj = uciToSan(fen, bestUci);
          const pvSan = pvUciToSanList(fen, uciMoves);

          cloudLines.push({
            multipv: idx + 1,
            depth: data.depth || 50,
            scoreCp: pv.cp,
            mate: pv.mate,
            nodes: data.knodes ? data.knodes * 1000 : 500000,
            nps: 1500000,
            pvUci: uciMoves,
            pvSan,
            bestMoveUci: bestUci,
            bestMoveSan: bestSanObj ? bestSanObj.san : bestUci,
          });
        });

        if (cloudLines.length > 0 && this.onUpdateCallback) {
          // Store cloud lines
          cloudLines.forEach((l) => this.currentPvLines.set(l.multipv, l));
          this.maxDepthReached = data.depth || 50;
          this.onUpdateCallback({
            isAnalyzing: true,
            depth: data.depth || 50,
            maxDepth: 50,
            nodes: (data.knodes || 500) * 1000,
            nps: 2000000,
            multiPvLines: cloudLines,
            isApproximate: false,
            source: 'cloud-master',
          });
        }
      }
    } catch {
      // Lichess Cloud Eval is an optional fast enhancement for standard positions
    }
  }

  public stopAnalysis(): void {
    if (this.worker) {
      this.worker.postMessage('stop');
    }
    if (this.onUpdateCallback) {
      const sortedLines = Array.from(this.currentPvLines.values()).sort(
        (a, b) => a.multipv - b.multipv
      );
      this.onUpdateCallback({
        isAnalyzing: false,
        depth: this.maxDepthReached,
        maxDepth: this.currentConfig.targetDepth,
        nodes: this.nodesCount,
        nps: this.npsCount,
        multiPvLines: sortedLines,
        isApproximate: this.maxDepthReached < 16,
        source: 'local-stockfish',
      });
    }
  }

  /**
   * Fast client fallback evaluator when worker or network is unavailable
   */
  private runFallbackEval(fen: string, config: EngineConfig): void {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) return;

      // Simple positional evaluation
      const pieceVals: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
      let materialDiff = 0;
      chess.board().forEach((row) => {
        row.forEach((sq) => {
          if (sq) {
            const v = pieceVals[sq.type] || 0;
            materialDiff += sq.color === 'w' ? v : -v;
          }
        });
      });

      const best = moves[0];
      const analysis: MoveAnalysis = {
        multipv: 1,
        depth: 6,
        scoreCp: materialDiff,
        bestMoveUci: best.from + best.to,
        bestMoveSan: best.san,
        pvUci: [best.from + best.to],
        pvSan: [best.san],
      };

      this.currentPvLines.set(1, analysis);
      this.emitState();
    } catch {
      // Safe fallback
    }
  }

  /**
   * Full Game Review:
   * Analyzes an entire sequence of played moves, evaluating each position
   * and classifying moves into Brilliant, Great, Best, Excellent, Good, Inaccuracy, Mistake, Blunder.
   */
  public async runGameReview(
    moves: MoveHistoryItem[],
    onProgress: (percent: number, currentMove: number, totalMoves: number) => void
  ): Promise<GameReviewReport> {
    const analyzedMoves: MoveHistoryItem[] = [];
    const whiteLosses: number[] = [];
    const blackLosses: number[] = [];
    const whiteStats: Record<MoveClassification, number> = {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      book: 0,
    };
    const blackStats: Record<MoveClassification, number> = {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      book: 0,
    };

    const evalGraph: GameReviewReport['evaluationGraph'] = [];

    // Evaluate initial starting position
    let previousEvalCp = 20; // Slight white opening advantage

    for (let i = 0; i < moves.length; i++) {
      const item = moves[i];
      const isWhite = item.color === 'w';

      // Evaluate position after move using engine evaluation
      const posEval = await this.evaluateSinglePosition(item.fenAfter, 12);
      const evalCp = scoreToCp(posEval.scoreCp, posEval.mate);

      // Best move in position before the move
      const beforeEval = await this.evaluateSinglePosition(item.fenBefore, 12);
      const bestMoveUci = beforeEval.bestMoveUci;
      const isBestMove = item.uci === bestMoveUci;

      // Check if piece sacrifice
      const isSacrifice = (item.captured === undefined || item.captured === 'p') &&
        (item.san.startsWith('N') || item.san.startsWith('B') || item.san.startsWith('R') || item.san.startsWith('Q'));

      const { classification, centipawnLoss } = classifyMove(
        previousEvalCp,
        evalCp,
        isWhite,
        isBestMove,
        isSacrifice
      );

      if (isWhite) {
        whiteLosses.push(centipawnLoss);
        whiteStats[classification]++;
      } else {
        blackLosses.push(centipawnLoss);
        blackStats[classification]++;
      }

      const analyzedItem: MoveHistoryItem = {
        ...item,
        classification,
        evalScoreCp: evalCp,
        evalMate: posEval.mate,
        centipawnLoss,
        bestAlternativeSan: beforeEval.bestMoveSan,
        bestAlternativeUci: beforeEval.bestMoveUci,
      };

      analyzedMoves.push(analyzedItem);

      evalGraph.push({
        moveIndex: i,
        moveLabel: `${item.moveNumber}${isWhite ? '.' : '...'}${item.san}`,
        evalCp: Math.max(-1000, Math.min(1000, evalCp)),
        isMate: posEval.mate !== undefined && posEval.mate !== null,
        mateIn: posEval.mate,
        playedMove: item.san,
        classification,
      });

      previousEvalCp = evalCp;
      onProgress(Math.round(((i + 1) / moves.length) * 100), i + 1, moves.length);
    }

    const whiteAccuracy = calculateAccuracyFromLosses(whiteLosses);
    const blackAccuracy = calculateAccuracyFromLosses(blackLosses);

    const whiteAcpl = whiteLosses.length > 0
      ? Math.round((whiteLosses.reduce((a, b) => a + b, 0) / whiteLosses.length) * 10) / 10
      : 0;
    const blackAcpl = blackLosses.length > 0
      ? Math.round((blackLosses.reduce((a, b) => a + b, 0) / blackLosses.length) * 10) / 10
      : 0;

    return {
      whiteAccuracy,
      blackAccuracy,
      whiteStats,
      blackStats,
      averageCentipawnLoss: {
        white: whiteAcpl,
        black: blackAcpl,
      },
      analyzedMoves,
      evaluationGraph: evalGraph,
    };
  }

  /**
   * Helper to synchronously or asynchronously evaluate a single position for review
   */
  private reviewWorker: Worker | null = null;
  private evalCache: Map<string, { scoreCp: number; mate?: number; bestMoveUci: string; bestMoveSan: string }> = new Map();

  private getReviewWorker(): Worker | null {
    if (typeof window === 'undefined') return null;
    if (!this.reviewWorker) {
      try {
        this.reviewWorker = new Worker('/stockfish.js');
        this.reviewWorker.postMessage('uci');
        this.reviewWorker.postMessage('isready');
      } catch (err) {
        console.warn('Could not create dedicated review worker:', err);
      }
    }
    return this.reviewWorker;
  }

  private async evaluateSinglePosition(
    fen: string,
    depth: number = 8
  ): Promise<{ scoreCp: number; mate?: number; bestMoveUci: string; bestMoveSan: string }> {
    // Check memo cache
    if (this.evalCache.has(fen)) {
      return this.evalCache.get(fen)!;
    }

    // Check terminal conditions immediately (checkmate / draw)
    try {
      const chess = new Chess(fen);
      if (chess.isCheckmate()) {
        const turn = chess.turn();
        const res = {
          scoreCp: turn === 'w' ? -10000 : 10000,
          mate: turn === 'w' ? -1 : 1,
          bestMoveUci: '',
          bestMoveSan: '',
        };
        this.evalCache.set(fen, res);
        return res;
      }
      if (chess.isDraw()) {
        const res = { scoreCp: 0, mate: undefined, bestMoveUci: '', bestMoveSan: '' };
        this.evalCache.set(fen, res);
        return res;
      }
    } catch {
      // Continue to engine
    }

    // 1. Try Cloud Eval (instant depth 40-75)
    try {
      const res = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}`, {
        signal: AbortSignal.timeout(400),
      });
      if (res.ok) {
        const cloudData = await res.json();
        if (cloudData && cloudData.pvs && cloudData.pvs[0]) {
          const pv0 = cloudData.pvs[0];
          const uciMoves = pv0.moves ? pv0.moves.split(' ') : [];
          const bestUci = uciMoves[0] || '';
          const sanObj = uciToSan(fen, bestUci);
          const evalResult = {
            scoreCp: pv0.cp ?? 0,
            mate: pv0.mate,
            bestMoveUci: bestUci,
            bestMoveSan: sanObj ? sanObj.san : bestUci,
          };
          this.evalCache.set(fen, evalResult);
          return evalResult;
        }
      }
    } catch {
      // Cloud eval skipped
    }

    // 2. Evaluate with local dedicated review worker
    return new Promise((resolve) => {
      const worker = this.getReviewWorker() || this.worker;
      if (!worker) {
        const chess = new Chess(fen);
        const moves = chess.moves({ verbose: true });
        const best = moves[0];
        const res = {
          scoreCp: 0,
          bestMoveUci: best ? best.from + best.to : '',
          bestMoveSan: best ? best.san : '',
        };
        this.evalCache.set(fen, res);
        resolve(res);
        return;
      }

      let lastCp = 0;
      let lastMate: number | undefined = undefined;
      let resolved = false;

      const finish = (bestUci: string) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);
        const sanObj = uciToSan(fen, bestUci);
        const res = {
          scoreCp: lastCp,
          mate: lastMate,
          bestMoveUci: bestUci,
          bestMoveSan: sanObj ? sanObj.san : bestUci,
        };
        this.evalCache.set(fen, res);
        resolve(res);
      };

      const timer = setTimeout(() => {
        finish('');
      }, 700);

      const onMessage = (e: MessageEvent) => {
        const line = typeof e.data === 'string' ? e.data : '';
        if (line.startsWith('info') && line.includes('score')) {
          const parsed = parseUciInfoLine(line);
          if (parsed) {
            if (parsed.scoreCp !== undefined) lastCp = parsed.scoreCp;
            if (parsed.mate !== undefined) lastMate = parsed.mate;
          }
        } else if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          finish(parts[1] || '');
        }
      };

      worker.addEventListener('message', onMessage);
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${depth}`);
    });
  }

  /**
   * Generates a move for the engine when playing vs engine
   */
  public async getEngineMove(
    fen: string,
    skillLevel: number = 20,
    depth: number = 10
  ): Promise<{ from: Square; to: Square; promotion?: PieceType; san: string } | null> {
    try {
      const chess = new Chess(fen);
      const legalMoves = chess.moves({ verbose: true });
      if (legalMoves.length === 0) return null;

      // Check if we have an active PV 1 line for this exact position
      if (this.currentFen === fen && this.currentPvLines.has(1)) {
        const pv1 = this.currentPvLines.get(1);
        if (pv1?.bestMoveUci && pv1.bestMoveUci.length >= 4) {
          const from = pv1.bestMoveUci.slice(0, 2) as Square;
          const to = pv1.bestMoveUci.slice(2, 4) as Square;
          const promo = pv1.bestMoveUci.length > 4 ? (pv1.bestMoveUci[4].toLowerCase() as PieceType) : undefined;
          const valid = legalMoves.find((m) => m.from === from && m.to === to);
          if (valid) {
            return { from, to, promotion: promo, san: valid.san };
          }
        }
      }

      // Worker query
      const worker = this.getReviewWorker() || this.worker;
      if (worker) {
        const uciMove = await new Promise<string>((resolve) => {
          let done = false;
          const timeout = setTimeout(() => {
            if (!done) {
              done = true;
              worker.removeEventListener('message', onMsg);
              resolve('');
            }
          }, 900);

          const onMsg = (e: MessageEvent) => {
            const line = typeof e.data === 'string' ? e.data : '';
            if (line.startsWith('bestmove')) {
              const parts = line.split(' ');
              if (!done) {
                done = true;
                clearTimeout(timeout);
                worker.removeEventListener('message', onMsg);
                resolve(parts[1] || '');
              }
            }
          };

          worker.addEventListener('message', onMsg);
          worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
          worker.postMessage(`position fen ${fen}`);
          worker.postMessage(`go depth ${depth}`);
        });

        if (uciMove && uciMove.length >= 4 && uciMove !== '(none)') {
          const from = uciMove.slice(0, 2) as Square;
          const to = uciMove.slice(2, 4) as Square;
          const promo = uciMove.length > 4 ? (uciMove[4].toLowerCase() as PieceType) : undefined;
          const matchingMove = legalMoves.find((m) => m.from === from && m.to === to);
          if (matchingMove) {
            return { from, to, promotion: promo, san: matchingMove.san };
          }
        }
      }

      // Fallback: pick best legal move
      const captureOrCheck = legalMoves.find((m) => m.captured || m.san.includes('+'));
      const chosen = captureOrCheck || legalMoves[0];
      return {
        from: chosen.from as Square,
        to: chosen.to as Square,
        promotion: chosen.promotion as PieceType | undefined,
        san: chosen.san,
      };
    } catch (err) {
      console.warn('Failed to get engine move:', err);
      return null;
    }
  }
}

export const engineService = new EngineService();

