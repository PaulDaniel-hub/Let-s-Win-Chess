import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseUciInfoLine,
  uciToSan,
  pvUciToSanList,
  calculateWinPercentage,
  classifyMove,
  calculateAccuracyFromLosses,
  formatEvaluation,
  getEvalBarPercentage,
  STARTING_FEN,
} from './chess-logic';

test('parseUciInfoLine correctly parses cp score, depth, multipv, and PV moves', () => {
  const line = 'info depth 14 seldepth 20 multipv 1 score cp 35 nodes 45210 nps 310000 pv e2e4 e7e5 g1f3 b8c6';
  const parsed = parseUciInfoLine(line);
  assert.ok(parsed);
  assert.equal(parsed.depth, 14);
  assert.equal(parsed.multipv, 1);
  assert.equal(parsed.scoreCp, 35);
  assert.equal(parsed.nodes, 45210);
  assert.equal(parsed.nps, 310000);
  assert.equal(parsed.bestMoveUci, 'e2e4');
  assert.deepEqual(parsed.pvUci, ['e2e4', 'e7e5', 'g1f3', 'b8c6']);
});

test('parseUciInfoLine correctly parses mate in X', () => {
  const line = 'info depth 10 multipv 1 score mate 3 nodes 12000 pv d1h5 g7g6 h5e5';
  const parsed = parseUciInfoLine(line);
  assert.ok(parsed);
  assert.equal(parsed.depth, 10);
  assert.equal(parsed.mate, 3);
  assert.equal(parsed.scoreCp, undefined);
  assert.equal(parsed.bestMoveUci, 'd1h5');
});

test('uciToSan converts e2e4 to e4 on starting board', () => {
  const res = uciToSan(STARTING_FEN, 'e2e4');
  assert.ok(res);
  assert.equal(res.san, 'e4');
  assert.equal(res.from, 'e2');
  assert.equal(res.to, 'e4');
});

test('pvUciToSanList converts principal variation array to SAN list', () => {
  const sanList = pvUciToSanList(STARTING_FEN, ['e2e4', 'e7e5', 'g1f3', 'b8c6']);
  assert.deepEqual(sanList, ['e4', 'e5', 'Nf3', 'Nc6']);
});

test('calculateWinPercentage returns 50% for 0 cp and higher for positive cp', () => {
  assert.equal(calculateWinPercentage(0), 50);
  assert.ok(calculateWinPercentage(100) > 55);
  assert.ok(calculateWinPercentage(300) > 70);
  assert.ok(calculateWinPercentage(-300) < 30);
});

test('classifyMove classifies best move correctly', () => {
  const res = classifyMove(30, 35, true, true);
  assert.equal(res.classification, 'best');
  assert.equal(res.centipawnLoss, 0);
});

test('classifyMove classifies major blunder correctly', () => {
  // White had +300 cp and after move is -200 cp (blunder of 500 cp)
  const res = classifyMove(300, -200, true, false);
  assert.equal(res.classification, 'blunder');
  assert.equal(res.centipawnLoss, 500);
});

test('calculateAccuracyFromLosses calculates expected percentage', () => {
  // Zero loss should give near ~100%
  const perfect = calculateAccuracyFromLosses([0, 0, 0, 0]);
  assert.ok(perfect >= 98);

  // High loss should give low accuracy
  const bad = calculateAccuracyFromLosses([250, 300, 150]);
  assert.ok(bad < 50);
});

test('formatEvaluation outputs correct format', () => {
  assert.equal(formatEvaluation(40), '+0.4');
  assert.equal(formatEvaluation(-120), '-1.2');
  assert.equal(formatEvaluation(0), '0.0');
  assert.equal(formatEvaluation(undefined, 2), '+M2');
  assert.equal(formatEvaluation(undefined, -1), '-M1');
});

test('getEvalBarPercentage responds symmetrically', () => {
  assert.equal(getEvalBarPercentage(0), 50);
  assert.ok(getEvalBarPercentage(500) > 80);
  assert.ok(getEvalBarPercentage(-500) < 20);
});
