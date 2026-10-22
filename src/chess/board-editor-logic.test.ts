import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boardToFen,
  fenToBoard,
  validateCustomPosition,
  calculateUndoStepCount,
  DEFAULT_CASTLING_RIGHTS,
  createEmptyGrid,
} from './board-editor-logic';
import { STARTING_FEN } from './chess-logic';

test('fenToBoard and boardToFen round-trips the starting position', () => {
  const { grid, turn, castling } = fenToBoard(STARTING_FEN);
  assert.equal(turn, 'w');
  assert.equal(castling.whiteKingside, true);
  assert.equal(castling.blackQueenside, true);

  const generatedFen = boardToFen(grid, turn, castling);
  assert.equal(generatedFen, STARTING_FEN);
});

test('validateCustomPosition approves the standard starting position', () => {
  const { grid, turn, castling } = fenToBoard(STARTING_FEN);
  const result = validateCustomPosition(grid, turn, castling);
  assert.equal(result.isValid, true);
});

test('validateCustomPosition rejects boards missing a king', () => {
  const emptyGrid = createEmptyGrid();
  // Only add white king
  emptyGrid[7][4] = { type: 'k', color: 'w' };
  const res = validateCustomPosition(emptyGrid, 'w', DEFAULT_CASTLING_RIGHTS);
  assert.equal(res.isValid, false);
  assert.match(res.message, /Black King/);
});

test('validateCustomPosition rejects pawns on the 1st or 8th rank', () => {
  const { grid, turn, castling } = fenToBoard(STARTING_FEN);
  // Put a pawn on rank 8 (row 0)
  grid[0][3] = { type: 'p', color: 'w' };
  const res = validateCustomPosition(grid, turn, castling);
  assert.equal(res.isValid, false);
  assert.match(res.message, /1st or 8th rank/);
});

test('validateCustomPosition rejects multiple kings of same color', () => {
  const { grid, turn, castling } = fenToBoard(STARTING_FEN);
  grid[4][4] = { type: 'k', color: 'w' }; // Second white king
  const res = validateCustomPosition(grid, turn, castling);
  assert.equal(res.isValid, false);
  assert.match(res.message, /more than one White King/);
});

test('calculateUndoStepCount returns 1 in free analysis mode', () => {
  assert.equal(calculateUndoStepCount(5, false, 'w', 'b'), 1);
  assert.equal(calculateUndoStepCount(1, false, 'w', 'b'), 1);
  assert.equal(calculateUndoStepCount(0, false, 'w', 'w'), 0);
});

test('calculateUndoStepCount returns 2 in vs-engine mode when it is player turn', () => {
  // Player is White, played move 1. e4, engine replied 1... e5, now it's White's turn again (2 moves in history)
  assert.equal(calculateUndoStepCount(2, true, 'w', 'w'), 2);
  // Player is Black, engine played 1. e4, player played 1... e5, engine replied 2. Nf3, now it's Black's turn (3 moves in history)
  assert.equal(calculateUndoStepCount(3, true, 'b', 'b'), 2);
  // If only 1 move was made (e.g. engine made first move for Black), undo 1
  assert.equal(calculateUndoStepCount(1, true, 'b', 'b'), 1);
});
