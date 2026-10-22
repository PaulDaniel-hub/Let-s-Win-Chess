import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialClockState,
  formatClockTime,
  tickClock,
  switchClockTurn,
  addTimeToClock,
  calculateMaterialDifference,
} from './clock-logic';
import { STARTING_FEN } from './chess-logic';

test('createInitialClockState initializes correct time in ms', () => {
  const clock = createInitialClockState(5, 3);
  assert.equal(clock.whiteTimeMs, 300000);
  assert.equal(clock.blackTimeMs, 300000);
  assert.equal(clock.incrementMs, 3000);
  assert.equal(clock.isRunning, false);
  assert.equal(clock.flaggedSide, null);
  assert.equal(clock.moveCount, 0);
});

test('formatClockTime formats standard minutes and seconds correctly', () => {
  assert.equal(formatClockTime(300000).formatted, '5:00');
  assert.equal(formatClockTime(65000).formatted, '1:05');
  assert.equal(formatClockTime(45000).formatted, '0:45');
  assert.equal(formatClockTime(45000).isLowTime, false);
});

test('formatClockTime formats low time and sub-10 second tenths', () => {
  const subTen = formatClockTime(8400);
  assert.equal(subTen.isLowTime, true);
  assert.equal(subTen.isCritical, true);
  assert.equal(subTen.formatted, '0:08.4');

  const zero = formatClockTime(0);
  assert.equal(zero.isFlagged, true);
  assert.equal(zero.formatted, '0:00');
});

test('tickClock decreases time for active side and flags when expired', () => {
  let clock = createInitialClockState(1, 0);
  clock.isRunning = true;
  clock.activeSide = 'w';

  // Tick 1000ms
  clock = tickClock(clock, 1000);
  assert.equal(clock.whiteTimeMs, 59000);
  assert.equal(clock.blackTimeMs, 60000);

  // Tick past zero
  clock = tickClock(clock, 60000);
  assert.equal(clock.whiteTimeMs, 0);
  assert.equal(clock.flaggedSide, 'w');
  assert.equal(clock.isRunning, false);
});

test('switchClockTurn adds increment to mover and switches active side', () => {
  let clock = createInitialClockState(3, 2); // 3 min + 2s increment
  clock.activeSide = 'w';
  clock.isRunning = true;
  clock.whiteTimeMs = 170000; // White spent 10s

  // White makes move -> Black is next
  clock = switchClockTurn(clock, 'b');
  assert.equal(clock.activeSide, 'b');
  // White gets +2s (2000ms)
  assert.equal(clock.whiteTimeMs, 172000);
  assert.equal(clock.moveCount, 1);
});

test('addTimeToClock adds 15s bonus correctly', () => {
  let clock = createInitialClockState(5, 0);
  clock = addTimeToClock(clock, 'w', 15000);
  assert.equal(clock.whiteTimeMs, 315000);
  assert.equal(clock.blackTimeMs, 300000);
});

test('calculateMaterialDifference calculates starting pieces as 0 advantage', () => {
  const res = calculateMaterialDifference(STARTING_FEN);
  assert.equal(res.whiteAdvantage, 0);
  assert.equal(res.capturedByWhite.length, 0);
  assert.equal(res.capturedByBlack.length, 0);
});

test('calculateMaterialDifference detects captured queen advantage', () => {
  // FEN without black queen
  const fenNoBlackQueen = 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const res = calculateMaterialDifference(fenNoBlackQueen);
  assert.equal(res.whiteAdvantage, 9);
  assert.deepEqual(res.capturedByWhite, ['q']);
});
