import { describe, it, expect } from 'vitest';
import { calculateMath } from '../lib/mathEvaluator';

describe('Math Evaluator Service', () => {
  it('correctly calculates basic arithmetic', () => {
    expect(calculateMath('2 + 2')).toBe(4);
    expect(calculateMath('10 - 4.5')).toBe(5.5);
    expect(calculateMath('3 * 7')).toBe(21);
    expect(calculateMath('25 / 5')).toBe(5);
  });

  it('handles operator precedence and parentheses', () => {
    expect(calculateMath('2 + 3 * 4')).toBe(14);
    expect(calculateMath('(2 + 3) * 4')).toBe(20);
    expect(calculateMath('((10 - 2) / 2) + 1')).toBe(5);
  });

  it('handles floating point decimals cleanly without precision drift', () => {
    expect(calculateMath('0.1 + 0.2')).toBe(0.3);
    expect(calculateMath('12.5 * 4.2 + 3.1')).toBe(55.6);
  });

  it('supports alternative multiplication and division symbols', () => {
    expect(calculateMath('6 × 7')).toBe(42);
    expect(calculateMath('100 ÷ 4')).toBe(25);
    expect(calculateMath('5 · 6')).toBe(30);
    expect(calculateMath('10 − 4')).toBe(6);
  });

  it('evaluates exponents', () => {
    expect(calculateMath('2 ^ 8')).toBe(256);
  });

  it('supports scientific functions and constants', () => {
    expect(calculateMath('sqrt(16)')).toBe(4);
    expect(calculateMath('cbrt(27)')).toBe(3);
    expect(calculateMath('sin(pi / 2)')).toBe(1);
    expect(calculateMath('cos(0)')).toBe(1);
    expect(calculateMath('ln(e)')).toBe(1);
    expect(calculateMath('log10(100)')).toBe(2);
    expect(calculateMath('abs(-42)')).toBe(42);
    expect(calculateMath('2 * π * 5')).toBeCloseTo(31.4159265, 5);
  });

  it('supports Unicode math symbols and superscripts', () => {
    expect(calculateMath('√64 + 3²')).toBe(17);
    expect(calculateMath('2³')).toBe(8);
  });

  it('evaluates scientific notation', () => {
    expect(calculateMath('1.5e-3 * 2000')).toBe(3);
    expect(calculateMath('3e8 / 1e3')).toBe(300000);
  });

  it('rejects invalid or unsafe strings', () => {
    expect(() => calculateMath('')).toThrow();
    expect(() => calculateMath('alert("xss")')).toThrow();
    expect(() => calculateMath('console.log(1)')).toThrow();
    expect(() => calculateMath('window.location')).toThrow();
  });
});
