import { describe, it, expect } from 'vitest';
import { calcFeeInr } from '../src/escrow';

describe('fee calculation', () => {
  it('handles zero principal', () => {
    expect(calcFeeInr(0)).toBe(0);
  });

  it('handles small principal', () => {
    expect(calcFeeInr(1)).toBe(0);
  });

  it('calculates for 1000', () => {
    expect(calcFeeInr(1000)).toBe(0.3);
  });

  it('caps at 20 for large principal', () => {
    expect(calcFeeInr(100000)).toBe(20);
  });

  it('boundary around cap', () => {
    // 66666.67 * 0.0003 ~= 20.000001 -> cap applies
    expect(calcFeeInr(66666.67)).toBe(20);
    // just below
    expect(calcFeeInr(66666)).toBe(Math.round(66666 * 0.0003 * 100) / 100);
  });

  it('rounding stability', () => {
    expect(calcFeeInr(12345)).toBe(Math.round(12345 * 0.0003 * 100) / 100);
  });
});
